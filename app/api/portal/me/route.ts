import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;
  if (!email) return NextResponse.json({ error: "No email on account" }, { status: 400 });

  // Find the client record by email (portal users are identified by email, not workspace)
  const client = await prisma.client.findFirst({
    where: { email: email.toLowerCase() },
    include: {
      workspace: { select: { businessName: true, brandColor: true, logoUrl: true } },
      program: {
        include: {
          steps:            { orderBy: { position: "asc" } },
          milestones:       { orderBy: { position: "asc" } },
          checkInTemplates: true,
        },
      },
      tasks: { orderBy: { createdAt: "asc" } },
      milestoneCompletions: true,
      checkInSubmissions: { orderBy: { submittedAt: "desc" }, take: 5 },
    },
  });

  if (!client) {
    return NextResponse.json({ error: "No client record found", code: "NOT_INVITED" }, { status: 404 });
  }

  return NextResponse.json({ client });
}
