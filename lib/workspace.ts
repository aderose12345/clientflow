import { prisma } from "./prisma";
import type { Workspace } from "@prisma/client";
import { cookies } from "next/headers";

const ADMIN_EMAIL = "a.derose12345@gmail.com";

export async function getOrCreateWorkspace(
  clerkUserId: string,
  userEmail: string
): Promise<Workspace> {
  // Admin override — if the admin is viewing another workspace
  if (userEmail === ADMIN_EMAIL) {
    try {
      const cookieStore = await cookies();
      const adminWs = cookieStore.get("adminViewingWorkspace")?.value;
      if (adminWs) {
        const ws = await prisma.workspace.findUnique({ where: { id: adminWs } });
        if (ws) return ws;
      }
    } catch {
      // cookies() may not be available in all contexts
    }
  }

  return prisma.workspace.upsert({
    where: { clerkUserId },
    update: { ownerEmail: userEmail },
    create: {
      clerkUserId,
      businessName: userEmail,
      ownerEmail: userEmail,
    },
  });
}
