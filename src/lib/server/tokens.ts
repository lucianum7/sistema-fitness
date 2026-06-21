import { addHours } from "date-fns";
import type { TokenType } from "@/generated/prisma/enums";
import { randomToken, sha256 } from "./crypto";
import { getPrisma } from "./db";

export async function createOneTimeToken(userId: string, type: TokenType, hoursToExpire: number) {
  const token = randomToken();
  await getPrisma().emailToken.create({
    data: {
      userId,
      type,
      tokenHash: sha256(token),
      expiresAt: addHours(new Date(), hoursToExpire),
    },
  });
  return token;
}

export async function consumeOneTimeToken(token: string, type: TokenType) {
  const prisma = getPrisma();
  const tokenHash = sha256(token);
  const record = await prisma.emailToken.findUnique({ where: { tokenHash } });

  if (!record || record.type !== type || record.usedAt || record.expiresAt < new Date()) {
    return null;
  }

  await prisma.emailToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return record;
}
