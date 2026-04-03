import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;
  if (!email) return NextResponse.json({ error: "No email on account" }, { status: 400 });

  const client = await prisma.client.findFirst({ where: { email: email.toLowerCase() } });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { templateId, answers } = body;

  if (!templateId) return NextResponse.json({ error: "templateId is required" }, { status: 400 });
  if (!answers)    return NextResponse.json({ error: "answers is required" }, { status: 400 });

  // Verify template belongs to client's program
  const template = await prisma.checkInTemplate.findFirst({
    where: { id: templateId, programId: client.programId ?? undefined },
  });
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const submission = await prisma.checkInSubmission.create({
    data: {
      templateId,
      clientId: client.id,
      answers: typeof answers === "string" ? answers : JSON.stringify(answers),
    },
  });

  await prisma.client.update({
    where: { id: client.id },
    data: { lastActivityAt: new Date() },
  });

  return NextResponse.json({ submission }, { status: 201 });
}
