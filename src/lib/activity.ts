import { Prisma } from "@prisma/client";
import { prisma } from "./db";

export async function logActivity({
  action,
  entityType,
  entityId,
  summary,
  metadata,
  userId,
}: {
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  metadata?: Record<string, unknown>;
  userId: string;
}) {
  await prisma.activityLog.create({
    data: {
      action,
      entityType,
      entityId,
      summary,
      metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
      userId,
    },
  });
}
