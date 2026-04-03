import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace } from "@/lib/workspace";

async function getWorkspaceAndProgram(userId: string, userEmail: string, programId: string) {
  const workspace = await getOrCreateWorkspace(userId, userEmail);
  const program = await prisma.program.findFirst({
    where: { id: programId, workspaceId: workspace.id },
  });
  return { workspace, program };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? userId;
  const { program } = await getWorkspaceAndProgram(userId, email, id);
  if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const full = await prisma.program.findUnique({
    where: { id },
    include: {
      steps:            { orderBy: { position: "asc" } },
      milestones:       { orderBy: { position: "asc" } },
      agreements:       true,
      checkInTemplates: true,
      _count: { select: { clients: true } },
    },
  });

  return NextResponse.json({ program: full });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? userId;
  const { program } = await getWorkspaceAndProgram(userId, email, id);
  if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, description, duration } = body;

  const updated = await prisma.program.update({
    where: { id },
    data: {
      ...(name        !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(duration    !== undefined && { duration: duration?.trim() || null }),
    },
  });

  return NextResponse.json({ program: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? userId;
  const { program } = await getWorkspaceAndProgram(userId, email, id);
  if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.programStep.deleteMany({ where: { programId: id } }),
    prisma.milestone.deleteMany({ where: { programId: id } }),
    prisma.checkInTemplate.deleteMany({ where: { programId: id } }),
    prisma.agreement.deleteMany({ where: { programId: id } }),
    prisma.program.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true });
}
