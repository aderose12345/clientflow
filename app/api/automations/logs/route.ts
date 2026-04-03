import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace } from "@/lib/workspace";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? userId;
  const workspace = await getOrCreateWorkspace(userId, email);

  const logs = await prisma.automationLog.findMany({
    where: { workspaceId: workspace.id },
    include: { client: { select: { firstName: true, lastName: true, email: true } } },
    orderBy: { sentAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ logs });
}
