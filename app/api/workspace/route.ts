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

  return NextResponse.json({ workspace });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? userId;
  const workspace = await getOrCreateWorkspace(userId, email);

  const body = await req.json();
  const { businessName, businessType, brandColor, hideBranding, portalWelcomeMessage, portalPrimaryColor, supportEmail, logoUrl } = body;

  const updated = await prisma.workspace.update({
    where: { id: workspace.id },
    data: {
      ...(businessName        !== undefined && { businessName: businessName.trim() }),
      ...(businessType        !== undefined && { businessType }),
      ...(brandColor          !== undefined && { brandColor }),
      ...(hideBranding        !== undefined && { hideBranding }),
      ...(portalWelcomeMessage !== undefined && { portalWelcomeMessage: portalWelcomeMessage?.trim() || null }),
      ...(portalPrimaryColor  !== undefined && { portalPrimaryColor: portalPrimaryColor || null }),
      ...(supportEmail        !== undefined && { supportEmail: supportEmail?.trim() || null }),
      ...(logoUrl             !== undefined && { logoUrl: logoUrl || null }),
    },
  });

  return NextResponse.json({ workspace: updated });
}
