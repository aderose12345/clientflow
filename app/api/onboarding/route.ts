import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace } from "@/lib/workspace";

const TEMPLATES: Record<string, { programName: string; steps: string[]; automations: { triggerType: string; messageTemplate: string }[] }> = {
  marketing_agency: {
    programName: "Client Onboarding Flow",
    steps: ["Send welcome email", "Schedule kickoff call", "Collect brand assets", "Review and approve strategy", "Launch first campaign"],
    automations: [
      { triggerType: "intake_not_submitted", messageTemplate: "Hi {clientName}, we are missing a few details to get started. Can you complete your onboarding form today?" },
      { triggerType: "task_overdue", messageTemplate: "Just a reminder that you have an overdue step in your onboarding. Let us know if you need help." },
      { triggerType: "client_inactive_7d", messageTemplate: "We have not heard from you in a while. Want to schedule a quick check-in call?" },
    ],
  },
  insurance_agency: {
    programName: "Policy Onboarding Flow",
    steps: ["Collect application documents", "Verify identity", "Review policy details", "Collect signature", "Submit to carrier", "Confirm coverage active"],
    automations: [
      { triggerType: "intake_not_submitted", messageTemplate: "Hi {clientName}, we need your documents to move forward with your policy. Please upload them as soon as possible." },
      { triggerType: "agreement_not_signed", messageTemplate: "Your policy documents are ready for your signature. Please sign them to activate your coverage." },
      { triggerType: "task_overdue", messageTemplate: "There is a pending step in your policy setup. Completing it quickly helps avoid delays in your coverage." },
      { triggerType: "client_inactive_7d", messageTemplate: "We want to make sure your policy setup stays on track. Can we schedule a quick call?" },
    ],
  },
  sales_org: {
    programName: "Post-Sale Onboarding",
    steps: ["Send welcome package", "Schedule onboarding call", "Collect required information", "Complete setup", "Confirm delivery or access"],
    automations: [
      { triggerType: "intake_not_submitted", messageTemplate: "Welcome! We just need a few details to get everything set up for you. Takes less than 2 minutes." },
      { triggerType: "task_overdue", messageTemplate: "You have a pending step in your setup. Complete it today so we can get you started." },
      { triggerType: "client_inactive_7d", messageTemplate: "We want to make sure you are getting value from your purchase. Can we connect this week?" },
    ],
  },
  coaching: {
    programName: "Client Kickoff Program",
    steps: ["Complete intake questionnaire", "Sign coaching agreement", "Schedule kickoff call", "Set 90-day goals", "Complete first module"],
    automations: [
      { triggerType: "intake_not_submitted", messageTemplate: "Before our first session we need your intake form completed. It helps us make the most of our time together." },
      { triggerType: "weekly_checkin", messageTemplate: "Your weekly progress update is due. Even a quick check-in helps us keep your momentum going." },
      { triggerType: "milestone_completed", messageTemplate: "Congratulations on completing a milestone! You are making real progress." },
    ],
  },
  consulting: {
    programName: "Client Engagement Flow",
    steps: ["Sign consulting agreement", "Complete discovery questionnaire", "Schedule strategy session", "Review and approve proposal", "Kickoff project"],
    automations: [
      { triggerType: "agreement_not_signed", messageTemplate: "Your consulting agreement is ready for review and signature. Please sign it so we can officially get started." },
      { triggerType: "intake_not_submitted", messageTemplate: "We need your discovery questionnaire before our strategy session. Please complete it when you have 10 minutes." },
      { triggerType: "task_overdue", messageTemplate: "There is a pending action item from our last session. Completing it will keep the project on track." },
    ],
  },
  other: {
    programName: "Client Onboarding",
    steps: ["Welcome and introduction", "Collect required information", "Review and sign agreement", "Schedule kickoff", "Begin work"],
    automations: [
      { triggerType: "intake_not_submitted", messageTemplate: "We need a bit more information to get started. Please complete the onboarding form." },
      { triggerType: "task_overdue", messageTemplate: "You have a pending step. Complete it to keep things moving forward." },
      { triggerType: "client_inactive_7d", messageTemplate: "We have not seen activity from you recently. Let us know if you need anything." },
    ],
  },
};

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? userId;
  const workspace = await getOrCreateWorkspace(userId, email);

  const [programCount, clientCount] = await Promise.all([
    prisma.program.count({ where: { workspaceId: workspace.id } }),
    prisma.client.count({ where: { workspaceId: workspace.id } }),
  ]);

  return NextResponse.json({ needsOnboarding: programCount === 0 && clientCount === 0 });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? userId;
  const workspace = await getOrCreateWorkspace(userId, email);

  const body = await req.json();
  const { businessName, businessType } = body;

  // Update workspace
  await prisma.workspace.update({
    where: { id: workspace.id },
    data: {
      businessName: businessName?.trim() || workspace.businessName,
      businessType: businessType || "other",
    },
  });

  // Get template
  const template = TEMPLATES[businessType] ?? TEMPLATES.other;

  // Create program with steps
  const program = await prisma.program.create({
    data: {
      workspaceId: workspace.id,
      name: template.programName,
      steps: {
        create: template.steps.map((title, i) => ({
          type: "task",
          title,
          position: i,
        })),
      },
    },
  });

  // Create automations
  await Promise.all(
    template.automations.map(a =>
      prisma.automationRule.create({
        data: {
          workspaceId: workspace.id,
          triggerType: a.triggerType,
          messageTemplate: a.messageTemplate,
          channel: "email",
          active: true,
        },
      })
    )
  );

  return NextResponse.json({ success: true, programId: program.id });
}
