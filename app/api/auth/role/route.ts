import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress?.toLowerCase();
  if (!email) return NextResponse.json({ error: "No email found" }, { status: 400 });

  // 1. Does this Clerk user OWN a workspace? → owner
  const workspace = await prisma.workspace.findUnique({
    where: { clerkUserId: userId },
  });
  if (workspace) {
    return NextResponse.json({ role: "owner" });
  }

  // 2. Is this Clerk user linked to a Client record? (by clerkUserId or email)
  const client = await prisma.client.findFirst({
    where: {
      OR: [
        { clerkUserId: userId },
        { email, inviteAccepted: true },
      ],
    },
    include: {
      workspace: { select: { id: true, businessName: true } },
      program: { select: { id: true, name: true } },
    },
  });

  if (client) {
    // Ensure clerkUserId is set for future lookups
    if (!client.clerkUserId) {
      await prisma.client.update({
        where: { id: client.id },
        data: { clerkUserId: userId },
      });
    }
    return NextResponse.json({
      role: "client",
      clientId: client.id,
      workspaceId: client.workspace.id,
      businessName: client.workspace.businessName,
      programName: client.program?.name ?? null,
    });
  }

  // 3. Also check by email without inviteAccepted (backwards compat for existing clients)
  const legacyClient = await prisma.client.findFirst({
    where: { email },
    include: {
      workspace: { select: { id: true, businessName: true } },
      program: { select: { id: true, name: true } },
    },
  });

  if (legacyClient) {
    // Link this Clerk user and mark accepted
    await prisma.client.update({
      where: { id: legacyClient.id },
      data: { clerkUserId: userId, inviteAccepted: true, inviteAcceptedAt: new Date() },
    });
    return NextResponse.json({
      role: "client",
      clientId: legacyClient.id,
      workspaceId: legacyClient.workspace.id,
      businessName: legacyClient.workspace.businessName,
      programName: legacyClient.program?.name ?? null,
    });
  }

  // 4. Neither — new user, treat as owner (goes to onboarding)
  return NextResponse.json({ role: "owner" });
}
