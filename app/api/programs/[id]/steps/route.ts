import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { STEP_TYPES } from "@/lib/constants";

const validTypes = STEP_TYPES.map((s) => s.value);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? userId;
  const workspace = await getOrCreateWorkspace(userId, email);

  const program = await prisma.program.findFirst({ where: { id, workspaceId: workspace.id } });
  if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const steps = await prisma.programStep.findMany({
    where: { programId: id },
    orderBy: { position: "asc" },
  });

  return NextResponse.json({ steps });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? userId;
  const workspace = await getOrCreateWorkspace(userId, email);

  const program = await prisma.program.findFirst({ where: { id, workspaceId: workspace.id } });
  if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { type, title, description } = body;

  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!validTypes.includes(type)) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  const last = await prisma.programStep.findFirst({
    where: { programId: id },
    orderBy: { position: "desc" },
  });
  const position = (last?.position ?? 0) + 1;

  const step = await prisma.programStep.create({
    data: { programId: id, type, title: title.trim(), description: description?.trim() || null, position },
  });

  return NextResponse.json({ step }, { status: 201 });
}
