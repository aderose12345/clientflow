import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace } from "@/lib/workspace";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? userId;
  const workspace = await getOrCreateWorkspace(userId, email);

  const rules = await prisma.automationRule.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { triggerType: "asc" },
  });

  return NextResponse.json({ rules });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? userId;
  const workspace = await getOrCreateWorkspace(userId, email);

  const body = await req.json();
  const { triggerType, messageTemplate, channel } = body;

  if (!triggerType?.trim())      return NextResponse.json({ error: "triggerType is required" }, { status: 400 });
  if (!messageTemplate?.trim())  return NextResponse.json({ error: "messageTemplate is required" }, { status: 400 });

  const rule = await prisma.automationRule.create({
    data: {
      workspaceId: workspace.id,
      triggerType,
      messageTemplate,
      channel: channel ?? "email",
      active: true,
    },
  });

  return NextResponse.json({ rule }, { status: 201 });
}
