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

  const existing = await prisma.automationRule.findFirst({ where: { id, workspaceId: workspace.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { active, messageTemplate } = body;

  const updated = await prisma.automationRule.update({
    where: { id },
    data: {
      ...(active          !== undefined && { active }),
      ...(messageTemplate !== undefined && { messageTemplate }),
    },
  });

  return NextResponse.json({ rule: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? userId;
  const workspace = await getOrCreateWorkspace(userId, email);

  const existing = await prisma.automationRule.findFirst({ where: { id, workspaceId: workspace.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.automationRule.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
