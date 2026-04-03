import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace } from "@/lib/workspace";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? userId;
  const workspace = await getOrCreateWorkspace(userId, email);

  const client = await prisma.client.findFirst({
    where: { id, workspaceId: workspace.id },
    include: {
      program: true,
      tasks: { orderBy: { createdAt: "desc" } },
      checkInSubmissions: {
        include: { template: { select: { name: true } } },
        orderBy: { submittedAt: "desc" },
        take: 10,
      },
      milestoneCompletions: {
        include: { milestone: { select: { title: true } } },
        orderBy: { completedAt: "desc" },
      },
    },
  });

  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ client });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? userId;
  const workspace = await getOrCreateWorkspace(userId, email);

  const existing = await prisma.client.findFirst({ where: { id, workspaceId: workspace.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { firstName, lastName, phone, status, programId, companyName, assignedTo } = body;

  const updated = await prisma.client.update({
    where: { id },
    data: {
      ...(firstName   !== undefined && { firstName: firstName.trim() }),
      ...(lastName    !== undefined && { lastName: lastName.trim() }),
      ...(phone       !== undefined && { phone: phone?.trim() || null }),
      ...(companyName !== undefined && { companyName: companyName?.trim() || null }),
      ...(assignedTo  !== undefined && { assignedTo: assignedTo?.trim() || null }),
      ...(status      !== undefined && { status }),
      ...(programId   !== undefined && { programId: programId || null }),
    },
    include: { program: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ client: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? userId;
  const workspace = await getOrCreateWorkspace(userId, email);

  const existing = await prisma.client.findFirst({ where: { id, workspaceId: workspace.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.documentRequest.deleteMany({ where: { clientId: id } }),
    prisma.checkInSubmission.deleteMany({ where: { clientId: id } }),
    prisma.milestoneCompletion.deleteMany({ where: { clientId: id } }),
    prisma.agreementAcceptance.deleteMany({ where: { clientId: id } }),
    prisma.note.deleteMany({ where: { clientId: id } }),
    prisma.task.deleteMany({ where: { clientId: id } }),
    prisma.client.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true });
}
