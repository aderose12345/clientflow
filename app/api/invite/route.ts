import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

  const client = await prisma.client.findUnique({
    where: { inviteToken: token },
    include: {
      workspace: { select: { id: true, businessName: true, logoUrl: true, brandColor: true } },
      program: { select: { id: true, name: true } },
    },
  });

  if (!client) return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
  if (client.inviteAccepted) return NextResponse.json({ error: "Invite already accepted", alreadyAccepted: true }, { status: 410 });

  return NextResponse.json({
    clientId: client.id,
    firstName: client.firstName,
    lastName: client.lastName,
    email: client.email,
    workspaceId: client.workspace.id,
    businessName: client.workspace.businessName,
    logoUrl: client.workspace.logoUrl,
    brandColor: client.workspace.brandColor,
    programName: client.program?.name ?? null,
  });
}
