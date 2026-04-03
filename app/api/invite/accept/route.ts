import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClerkClient } from "@clerk/nextjs/server";
import { logActivity } from "@/lib/activity";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { token, password } = body;

  if (!token || !password) {
    return NextResponse.json({ error: "Token and password required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const client = await prisma.client.findUnique({
    where: { inviteToken: token },
    include: { workspace: true },
  });

  if (!client) return NextResponse.json({ error: "Invalid invite token" }, { status: 404 });
  if (client.inviteAccepted) return NextResponse.json({ error: "Invite already accepted" }, { status: 410 });

  try {
    // Create Clerk user with the client's email and password
    const clerkUser = await clerk.users.createUser({
      emailAddress: [client.email],
      password,
      firstName: client.firstName,
      lastName: client.lastName,
    });

    // Mark invite as accepted and link Clerk user ID
    await prisma.client.update({
      where: { id: client.id },
      data: {
        inviteAccepted: true,
        inviteAcceptedAt: new Date(),
        clerkUserId: clerkUser.id,
        lastActivityAt: new Date(),
        status: "on_track",
      },
    });

    // Log activity
    await logActivity(client.workspace.id, client.id, "invite_accepted", {
      email: client.email,
    });

    return NextResponse.json({
      success: true,
      clerkUserId: clerkUser.id,
      redirectUrl: "/portal",
    });
  } catch (err: unknown) {
    console.error("[invite/accept] Error creating Clerk user:", err);

    // Handle Clerk errors (e.g. email already exists)
    const message = err instanceof Error ? err.message : "Failed to create account";
    if (message.includes("already exists") || message.includes("taken")) {
      // User already has a Clerk account — just mark invite as accepted
      // Find the existing Clerk user by email
      const existingUsers = await clerk.users.getUserList({ emailAddress: [client.email] });
      const existingUser = existingUsers.data[0];

      if (existingUser) {
        await prisma.client.update({
          where: { id: client.id },
          data: {
            inviteAccepted: true,
            inviteAcceptedAt: new Date(),
            clerkUserId: existingUser.id,
            lastActivityAt: new Date(),
          },
        });

        await logActivity(client.workspace.id, client.id, "invite_accepted", {
          email: client.email,
          existingAccount: true,
        });

        return NextResponse.json({
          success: true,
          existingAccount: true,
          redirectUrl: "/sign-in",
          message: "You already have an account. Please sign in.",
        });
      }
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
