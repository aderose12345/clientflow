import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;
  if (!email) return NextResponse.json({ error: "No email on account" }, { status: 400 });

  // Verify this task belongs to the requesting client (identified by email)
  const client = await prisma.client.findFirst({ where: { email: email.toLowerCase() } });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const task = await prisma.task.findFirst({ where: { id, clientId: client.id } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.task.update({
    where: { id },
    data: { status: "complete", completedAt: new Date() },
  });

  // Update client lastActivityAt
  await prisma.client.update({
    where: { id: client.id },
    data: { lastActivityAt: new Date() },
  });

  return NextResponse.json({ task: updated });
}
