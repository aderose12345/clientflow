import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace } from "@/lib/workspace";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? userId;
  const workspace = await getOrCreateWorkspace(userId, email);

  const { searchParams } = new URL(req.url);
  const templateId = searchParams.get("templateId") ?? undefined;

  if (templateId) {
    const submissions = await prisma.checkInSubmission.findMany({
      where: { templateId },
      include: { client: { select: { firstName: true, lastName: true } } },
      orderBy: { submittedAt: "desc" },
    });
    return NextResponse.json({ submissions });
  }

  const templates = await prisma.checkInTemplate.findMany({
    where: { workspaceId: workspace.id },
    include: { _count: { select: { submissions: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? userId;
  const workspace = await getOrCreateWorkspace(userId, email);

  const body = await req.json();
  const { programId, name, frequency, questions } = body;

  if (!name?.trim())             return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!programId)                return NextResponse.json({ error: "programId is required" }, { status: 400 });
  if (!Array.isArray(questions)) return NextResponse.json({ error: "questions must be an array" }, { status: 400 });

  const template = await prisma.checkInTemplate.create({
    data: {
      workspaceId: workspace.id,
      programId,
      name: name.trim(),
      frequency: frequency ?? "weekly",
      questions: JSON.stringify(questions),
    },
  });

  return NextResponse.json({ template }, { status: 201 });
}
