import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { sendClientInvite } from "@/lib/email";
import { logActivity } from "@/lib/activity";

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
  const { firstName, lastName, email, phone, programId, companyName, assignedTo, newProgramName } = body;

  if (!firstName?.trim()) return NextResponse.json({ error: "First name is required" }, { status: 400 });
  if (!lastName?.trim())  return NextResponse.json({ error: "Last name is required" }, { status: 400 });
  if (!email?.trim())     return NextResponse.json({ error: "Email is required" }, { status: 400 });

  // If a new program name is provided, create it first
  let resolvedProgramId = programId || null;
  if (!resolvedProgramId && newProgramName?.trim()) {
    const newProgram = await prisma.program.create({
      data: { workspaceId: workspace.id, name: newProgramName.trim() },
    });
    resolvedProgramId = newProgram.id;
  }

  try {
    const client = await prisma.client.create({
      data: {
        workspaceId: workspace.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        companyName: companyName?.trim() || null,
        assignedTo: assignedTo?.trim() || null,
        programId: resolvedProgramId,
        status: "on_track",
        invitedAt: new Date(),
      },
      include: { program: { select: { id: true, name: true } } },
    });

    await logActivity(workspace.id, client.id, "client_invited", {
      email: client.email,
      programName: client.program?.name,
    });

    const coachName = user?.fullName ?? coachEmail;
    console.log("[clients/POST] Client created, sending invite email to:", client.email);
    console.log("[clients/POST] coachName:", coachName, "businessName:", workspace.businessName, "programName:", client.program?.name);

    let emailResult: unknown = null;
    let emailError: string | null = null;
    try {
      emailResult = await sendClientInvite({
        toEmail: client.email,
        toName: `${client.firstName} ${client.lastName}`,
        coachName,
        businessName: workspace.businessName,
        programName: client.program?.name,
      });
      console.log("[clients/POST] Email result:", JSON.stringify(emailResult));
    } catch (emailErr) {
      emailError = String(emailErr);
      console.error("[clients/POST] Email send failed:", emailErr);
    }

    return NextResponse.json({ client, _email: { result: emailResult, error: emailError } }, { status: 201 });
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
