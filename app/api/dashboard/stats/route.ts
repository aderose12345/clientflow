import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace } from "@/lib/workspace";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? userId;
  const workspace = await getOrCreateWorkspace(userId, email);

  const clients = await prisma.client.findMany({
    where: { workspaceId: workspace.id },
    include: {
      program: { include: { steps: true } },
      stepCompletions: true,
      tasks: true,
    },
  });

  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;

  let onTrack = 0;
  let needsAttention = 0;
  let stuck = 0;
  let churned = 0;

  const clientsWithStatus = clients.map(c => {
    const lastActive = c.lastActivityAt ? now - new Date(c.lastActivityAt).getTime() : Infinity;
    const overdueTasks = c.tasks.filter(t => t.status !== "complete" && t.dueDate && new Date(t.dueDate).getTime() < now).length;
    const totalSteps = c.program?.steps.filter(s => s.type !== "resource").length ?? 0;
    const completedSteps = c.stepCompletions.length;
    const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    let calculatedStatus: string;
    if (c.status === "churned") {
      calculatedStatus = "churned";
      churned++;
    } else if (lastActive > fourteenDays || overdueTasks >= 2) {
      calculatedStatus = "stuck";
      stuck++;
    } else if (lastActive > sevenDays || overdueTasks >= 1) {
      calculatedStatus = "needs_attention";
      needsAttention++;
    } else {
      calculatedStatus = "on_track";
      onTrack++;
    }

    return {
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      status: c.status,
      calculatedStatus,
      programName: c.program?.name ?? null,
      progressPct,
      completedSteps,
      totalSteps,
      lastActivityAt: c.lastActivityAt,
      overdueTasks,
    };
  });

  // Sort by risk (stuck first, then needs_attention, then on_track)
  const riskOrder: Record<string, number> = { stuck: 0, needs_attention: 1, on_track: 2, churned: 3 };
  clientsWithStatus.sort((a, b) => (riskOrder[a.calculatedStatus] ?? 4) - (riskOrder[b.calculatedStatus] ?? 4));

  // Unreviewed progress updates (check-in submissions from last 7 days)
  const recentUpdates = await prisma.checkInSubmission.count({
    where: {
      client: { workspaceId: workspace.id },
      submittedAt: { gte: new Date(now - sevenDays) },
    },
  });

  return NextResponse.json({
    total: clients.length,
    onTrack,
    needsAttention,
    stuck,
    churned,
    clients: clientsWithStatus,
    recentUpdatesCount: recentUpdates,
  });
}
