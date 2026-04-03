import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace } from "@/lib/workspace";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? userId;
  const workspace = await getOrCreateWorkspace(userId, email);

  const docs = await prisma.documentRequest.findMany({
    where: { clientId, workspaceId: workspace.id },
    orderBy: { requestedAt: "desc" },
  });

  return NextResponse.json({ documents: docs });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? userId;
  const workspace = await getOrCreateWorkspace(userId, email);

  const body = await req.json();
  const { clientId, title, description, required } = body;

  if (!clientId || !title?.trim()) {
    return NextResponse.json({ error: "clientId and title required" }, { status: 400 });
  }

  const doc = await prisma.documentRequest.create({
    data: {
      workspaceId: workspace.id,
      clientId,
      title: title.trim(),
      description: description?.trim() || null,
      required: required ?? true,
    },
  });

  return NextResponse.json({ document: doc }, { status: 201 });
}
