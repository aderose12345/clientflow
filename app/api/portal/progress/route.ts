import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress?.toLowerCase();
  if (!email) return NextResponse.json({ error: "No email" }, { status: 400 });

  const client = await prisma.client.findFirst({
    where: { OR: [{ clerkUserId: userId }, { email }] },
    include: {
      program: {
        include: {
          steps: { orderBy: { position: "asc" }, include: { completions: true } },
        },
      },
      stepCompletions: true,
      tasks: true,
      formSubmissions: true,
      agreementAcceptances: true,
      checkInSubmissions: true,
      documentRequests: true,
    },
  });

  if (!client || !client.program) {
    return NextResponse.json({ steps: [], currentStep: null, progressPct: 0 });
  }

  const steps = client.program.steps.map(step => {
    const isCompleted = client.stepCompletions.some(sc => sc.stepId === step.id);
    return {
      id: step.id,
      type: step.type,
      title: step.title,
      description: step.description,
      position: step.position,
      fields: step.fields,
      completed: isCompleted,
      completedAt: client.stepCompletions.find(sc => sc.stepId === step.id)?.completedAt ?? null,
    };
  });

  const completableSteps = steps.filter(s => s.type !== "resource");
  const completedCount = completableSteps.filter(s => s.completed).length;
  const totalCount = completableSteps.length || 1;
  const currentStep = steps.find(s => !s.completed && s.type !== "resource") ?? null;

  return NextResponse.json({
    steps,
    currentStep,
    progressPct: Math.round((completedCount / totalCount) * 100),
    completedCount,
    totalCount,
  });
}
