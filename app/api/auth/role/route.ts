import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress?.toLowerCase();
  if (!email) return NextResponse.json({ error: "No email found" }, { status: 400 });

  // Check if this email exists as a client in any workspace
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

  return NextResponse.json({ role: "owner" });
}
