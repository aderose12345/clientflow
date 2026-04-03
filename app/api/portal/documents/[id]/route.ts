import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;
  if (!email) return NextResponse.json({ error: "No email" }, { status: 400 });

  const client = await prisma.client.findFirst({ where: { email: email.toLowerCase() } });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify this document belongs to the client
  const doc = await prisma.documentRequest.findFirst({ where: { id, clientId: client.id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { fileUrl, fileName } = body;

  const updated = await prisma.documentRequest.update({
    where: { id },
    data: {
      fileUrl: fileUrl ?? null,
      fileName: fileName ?? null,
      status: "uploaded",
      uploadedAt: new Date(),
    },
  });

  return NextResponse.json({ document: updated });
}
