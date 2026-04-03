import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = "a.derose12345@gmail.com";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;
  if (email !== ADMIN_EMAIL) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const section = req.nextUrl.searchParams.get("section") ?? "overview";

  if (section === "overview") {
    const [totalWorkspaces, totalClients, activeSubscriptions, trialAccounts] = await Promise.all([
      prisma.workspace.count(),
      prisma.client.count(),
      prisma.workspace.count({ where: { subscriptionStatus: "active" } }),
      prisma.workspace.count({ where: { subscriptionStatus: "trial" } }),
    ]);
    return NextResponse.json({
      overview: {
        totalWorkspaces,
        totalClients,
        activeSubscriptions,
        trialAccounts,
        estimatedRevenue: activeSubscriptions * 137,
      },
    });
  }

  if (section === "workspaces") {
    const workspaces = await prisma.workspace.findMany({
      include: { _count: { select: { clients: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ workspaces });
  }

  if (section === "users") {
    const workspaces = await prisma.workspace.findMany({
      select: { id: true, clerkUserId: true, businessName: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ users: workspaces });
  }

  if (section === "revenue") {
    const workspaces = await prisma.workspace.findMany({
      where: { subscriptionStatus: "active" },
      select: { id: true, businessName: true, subscriptionStatus: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    const activeCount = workspaces.length;
    return NextResponse.json({
      revenue: {
        activeSubscriptions: activeCount,
        mrr: activeCount * 137,
        payingWorkspaces: workspaces,
      },
    });
  }

  return NextResponse.json({ error: "Unknown section" }, { status: 400 });
}
