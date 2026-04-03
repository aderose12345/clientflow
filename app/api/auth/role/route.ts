import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress?.toLowerCase();
  if (!email) return NextResponse.json({ error: "No email found" }, { status: 400 });

  // First check: does this Clerk user OWN a workspace? If so, they're an owner.
  const workspace = await prisma.workspace.findUnique({
    where: { clerkUserId: userId },
  });
  if (workspace) {
    return NextResponse.json({ role: "owner" });
  }

  // Second check: is this email in the Client table? If so, they're a client.
  const client = await prisma.client.findFirst({
    where: { email },
    include: {
      program: { select: { id: true, name: true } },
      workspace: { select: { id: true, businessName: true } },
    },
  });

  if (client) {
    return NextResponse.json({
      role: "client",
      clientId: client.id,
      workspaceId: client.workspace.id,
      businessName: client.workspace.businessName,
      programName: client.program?.name ?? null,
    });
  }

  // Neither — new user, treat as owner (will go through onboarding)
  return NextResponse.json({ role: "owner" });
}
