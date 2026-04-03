import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clerkClient } from "@clerk/nextjs/server";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { token, password } = body;

  if (!token || !password) {
    return NextResponse.json({ error: "Token and password required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const foundClient = await prisma.client.findUnique({
    where: { inviteToken: token },
    include: { workspace: true },
  });

  if (!foundClient) return NextResponse.json({ error: "Invalid invite token" }, { status: 404 });
  if (foundClient.inviteAccepted) return NextResponse.json({ error: "Invite already accepted" }, { status: 410 });

  const clerk = await clerkClient();

  try {
    // Create Clerk user with the client's email and password
    const clerkUser = await clerk.users.createUser({
      emailAddress: [foundClient.email],
      password,
      firstName: foundClient.firstName,
      lastName: foundClient.lastName,
    });

    // Mark invite as accepted and link Clerk user ID
    await prisma.client.update({
      where: { id: foundClient.id },
      data: {
        inviteAccepted: true,
        inviteAcceptedAt: new Date(),
        clerkUserId: clerkUser.id,
        lastActivityAt: new Date(),
        status: "on_track",
      },
    });

    await logActivity(foundClient.workspace.id, foundClient.id, "invite_accepted", {
      email: foundClient.email,
    });

    return NextResponse.json({
      success: true,
      clerkUserId: clerkUser.id,
      redirectUrl: "/sign-in",
    });
  } catch (err: unknown) {
    console.error("[invite/accept] Clerk createUser error:", JSON.stringify(err, null, 2));

    // Extract Clerk error details
    const clerkErr = err as { errors?: Array<{ message: string; code: string }>; message?: string };
    const errors = clerkErr.errors;
    const firstError = errors?.[0];
    const message = firstError?.message || clerkErr.message || "Failed to create account";
    const code = firstError?.code || "";

    // Handle "email already exists" — link existing Clerk user
    if (code === "form_identifier_exists" || message.toLowerCase().includes("already") || message.toLowerCase().includes("taken")) {
      try {
        const existingUsers = await clerk.users.getUserList({ emailAddress: [foundClient.email] });
        const existingUser = existingUsers.data[0];

        if (existingUser) {
          await prisma.client.update({
            where: { id: foundClient.id },
            data: {
              inviteAccepted: true,
              inviteAcceptedAt: new Date(),
              clerkUserId: existingUser.id,
              lastActivityAt: new Date(),
            },
          });

          await logActivity(foundClient.workspace.id, foundClient.id, "invite_accepted", {
            email: foundClient.email,
            existingAccount: true,
          });

          return NextResponse.json({
            success: true,
            existingAccount: true,
            redirectUrl: "/sign-in",
            message: "You already have an account. Please sign in.",
          });
        }
      } catch (lookupErr) {
        console.error("[invite/accept] Error looking up existing user:", lookupErr);
      }
    }

    return NextResponse.json({
      error: message,
      code,
      details: errors,
    }, { status: 400 });
  }
}
