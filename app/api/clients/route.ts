import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { sendClientInvite } from "@/lib/email";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? userId;
  const workspace = await getOrCreateWorkspace(userId, email);

  const clients = await prisma.client.findMany({
    where: { workspaceId: workspace.id },
    include: { program: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ clients });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const coachEmail = user?.emailAddresses[0]?.emailAddress ?? userId;
  const workspace = await getOrCreateWorkspace(userId, coachEmail);

  const body = await req.json();
  const { firstName, lastName, email, phone, programId } = body;

  if (!firstName?.trim()) return NextResponse.json({ error: "First name is required" }, { status: 400 });
  if (!lastName?.trim())  return NextResponse.json({ error: "Last name is required" }, { status: 400 });
  if (!email?.trim())     return NextResponse.json({ error: "Email is required" }, { status: 400 });

  try {
    const client = await prisma.client.create({
      data: {
        workspaceId: workspace.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        programId: programId || null,
        status: "on_track",
        invitedAt: new Date(),
      },
      include: { program: { select: { id: true, name: true } } },
    });

    const coachName = user?.fullName ?? coachEmail;
    await sendClientInvite({
      toEmail: client.email,
      toName: `${client.firstName} ${client.lastName}`,
      coachName,
      businessName: workspace.businessName,
      programName: client.program?.name,
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A client with this email already exists in your workspace" },
        { status: 409 }
      );
    }
    throw err;
  }
}
