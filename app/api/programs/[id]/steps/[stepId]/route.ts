import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace } from "@/lib/workspace";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, stepId } = await params;
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? userId;
  const workspace = await getOrCreateWorkspace(userId, email);

  const program = await prisma.program.findFirst({ where: { id, workspaceId: workspace.id } });
  if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.programStep.delete({ where: { id: stepId } });
  return NextResponse.json({ success: true });
}
