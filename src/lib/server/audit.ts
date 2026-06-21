import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "./db";

export async function auditLog(input: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipHash?: string | null;
}) {
  const prisma = getPrisma();
  await prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      ipHash: input.ipHash ?? null,
    },
  });
}
