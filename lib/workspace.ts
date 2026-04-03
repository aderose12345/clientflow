import { prisma } from "./prisma";
import type { Workspace } from "@prisma/client";

export async function getOrCreateWorkspace(
  clerkUserId: string,
  userEmail: string
): Promise<Workspace> {
  return prisma.workspace.upsert({
    where: { clerkUserId },
    update: {},
    create: {
      clerkUserId,
      businessName: userEmail,
    },
  });
}
