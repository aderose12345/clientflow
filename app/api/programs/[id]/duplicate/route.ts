import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace } from "@/lib/workspace";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? userId;
  const workspace = await getOrCreateWorkspace(userId, email);

  const original = await prisma.program.findFirst({
    where: { id, workspaceId: workspace.id },
    include: { steps: { orderBy: { position: "asc" } } },
  });
  if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const copy = await prisma.program.create({
    data: {
      workspaceId: workspace.id,
      name: `${original.name} (Copy)`,
      description: original.description,
      duration: original.duration,
      steps: {
        create: original.steps.map(s => ({
          type: s.type,
          title: s.title,
          description: s.description,
          position: s.position,
        })),
      },
    },
    include: { steps: { orderBy: { position: "asc" } }, _count: { select: { clients: true } } },
  });

  return NextResponse.json({ program: copy }, { status: 201 });
}
