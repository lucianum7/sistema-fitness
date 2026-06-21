import { getPrisma } from "./db";

export async function checkRateLimit(options: {
  key: string;
  action: string;
  limit: number;
  windowSeconds: number;
}) {
  const prisma = getPrisma();
  const now = new Date();
  const resetAt = new Date(now.getTime() + options.windowSeconds * 1000);
  const current = await prisma.rateLimitBucket.findUnique({
    where: { key_action: { key: options.key, action: options.action } },
  });

  if (!current || current.resetAt <= now) {
    await prisma.rateLimitBucket.upsert({
      where: { key_action: { key: options.key, action: options.action } },
      create: { key: options.key, action: options.action, count: 1, resetAt },
      update: { count: 1, resetAt },
    });
    return { allowed: true, remaining: options.limit - 1, resetAt };
  }

  if (current.count >= options.limit) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }

  const updated = await prisma.rateLimitBucket.update({
    where: { key_action: { key: options.key, action: options.action } },
    data: { count: { increment: 1 } },
  });

  return { allowed: true, remaining: Math.max(options.limit - updated.count, 0), resetAt: current.resetAt };
}
