import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;
  if (!email) return NextResponse.json({ error: "No email" }, { status: 400 });

  const client = await prisma.client.findFirst({
    where: { email: email.toLowerCase() },
  });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const documents = await prisma.documentRequest.findMany({
    where: { clientId: client.id },
    orderBy: { requestedAt: "desc" },
  });

  return NextResponse.json({ documents });
}
