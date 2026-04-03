import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAgencyNotification } from "@/lib/email";
import { logActivity } from "@/lib/activity";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ stepId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stepId } = await params;
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress?.toLowerCase();
  if (!email) return NextResponse.json({ error: "No email" }, { status: 400 });

  const client = await prisma.client.findFirst({
    where: { email },
    include: {
      program: { include: { steps: true } },
      workspace: true,
    },
  });

  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const step = client.program?.steps.find(s => s.id === stepId);
  if (!step) return NextResponse.json({ error: "Step not found" }, { status: 404 });

  // Check if already completed
  const existing = await prisma.stepCompletion.findUnique({
    where: { clientId_stepId: { clientId: client.id, stepId } },
  });
  if (existing) return NextResponse.json({ success: true, alreadyCompleted: true });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty body is ok */ }

  // Handle step-type-specific data
  if (step.type === "intake_form" && body.answers) {
    // Save form submission
    const submission = await prisma.formSubmission.create({
      data: {
        clientId: client.id,
        stepId,
        answers: {
          create: Object.entries(body.answers as Record<string, string>).map(([, value]) => ({
            value: String(value),
          })),
        },
      },
    });
    await prisma.stepCompletion.create({
      data: { clientId: client.id, stepId, data: { submissionId: submission.id, answers: body.answers } },
    });
  } else if (step.type === "agreement" && body.fullName) {
    // Save agreement acceptance
    await prisma.agreementAcceptance.create({
      data: {
        clientId: client.id,
        stepId,
        fullName: String(body.fullName),
      },
    });
    await prisma.stepCompletion.create({
      data: { clientId: client.id, stepId, data: { fullName: body.fullName, signedAt: new Date().toISOString() } },
    });
  } else if (step.type === "task") {
    // Complete matching task
    const task = await prisma.task.findFirst({
      where: { clientId: client.id, title: step.title, status: { not: "complete" } },
    });
    if (task) {
      await prisma.task.update({
        where: { id: task.id },
        data: { status: "complete", completedAt: new Date() },
      });
    }
    await prisma.stepCompletion.create({
      data: { clientId: client.id, stepId, data: { taskId: task?.id } },
    });
  } else if (step.type === "checkin" && body.answers) {
    // Save check-in
    await prisma.checkInSubmission.create({
      data: {
        clientId: client.id,
        stepId,
        answers: JSON.stringify(body.answers),
      },
    });
    await prisma.stepCompletion.create({
      data: { clientId: client.id, stepId, data: body.answers as object },
    });
  } else if (step.type === "document") {
    // Document steps are completed via the document upload flow
    await prisma.stepCompletion.create({
      data: { clientId: client.id, stepId, data: body as object },
    });
  } else {
    // Generic completion (resource, etc.)
    await prisma.stepCompletion.create({
      data: { clientId: client.id, stepId, data: body as object },
    });
  }

  // Update last activity and mark as on_track (active client)
  await prisma.client.update({
    where: { id: client.id },
    data: { lastActivityAt: new Date(), status: "on_track" },
  });

  // Log activity
  await logActivity(client.workspace.id, client.id, `step_completed_${step.type}`, {
    stepId: step.id,
    stepTitle: step.title,
    stepType: step.type,
  });

  // Send agency notification
  if (client.workspace.ownerEmail) {
    sendAgencyNotification({
      toEmail: client.workspace.ownerEmail,
      clientName: `${client.firstName} ${client.lastName}`,
      stepTitle: step.title,
      programName: client.program?.name ?? "Unknown Program",
    }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
