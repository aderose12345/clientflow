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
  const clientId  = searchParams.get("clientId")  ?? undefined;
  const programId = searchParams.get("programId") ?? undefined;

  const tasks = await prisma.task.findMany({
    where: { workspaceId: workspace.id, ...(clientId && { clientId }), ...(programId && { programId }) },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? userId;
  const workspace = await getOrCreateWorkspace(userId, email);

  const body = await req.json();
  const { clientId, programId, title, description, dueDate } = body;

  if (!clientId?.trim()) return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  if (!title?.trim())    return NextResponse.json({ error: "title is required" }, { status: 400 });

  const task = await prisma.task.create({
    data: {
      workspaceId: workspace.id,
      clientId,
      programId: programId || null,
      title: title.trim(),
      description: description?.trim() || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: "pending",
    },
  });

  return NextResponse.json({ task }, { status: 201 });
}
