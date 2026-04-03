import { prisma } from "@/lib/prisma";

export async function logActivity(
  workspaceId: string,
  clientId: string,
  eventType: string,
  metadata?: Record<string, unknown>
) {
  await prisma.activityEvent.create({
    data: {
      workspaceId,
      clientId,
      eventType,
      metadataJson: metadata ? JSON.stringify(metadata) : null,
    },
  });
}
