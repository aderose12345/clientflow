import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace } from "@/lib/workspace";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? userId;
  const workspace = await getOrCreateWorkspace(userId, email);

  const existing = await prisma.task.findFirst({ where: { id, workspaceId: workspace.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { title, description, dueDate, status } = body;

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...(title       !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(dueDate     !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(status      !== undefined && {
        status,
        completedAt: status === "complete" ? new Date() : null,
      }),
    },
  });

  return NextResponse.json({ task: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? userId;
  const workspace = await getOrCreateWorkspace(userId, email);

  const existing = await prisma.task.findFirst({ where: { id, workspaceId: workspace.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
