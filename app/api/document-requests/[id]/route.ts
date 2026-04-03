import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { status, fileUrl, fileName } = body;

  const updated = await prisma.documentRequest.update({
    where: { id },
    data: {
      ...(status   !== undefined && { status }),
      ...(fileUrl  !== undefined && { fileUrl }),
      ...(fileName !== undefined && { fileName }),
      ...(status === "uploaded" && { uploadedAt: new Date() }),
    },
  });

  return NextResponse.json({ document: updated });
}
