import { NextRequest } from "next/server";
import { auditLog } from "@/lib/server/audit";
import { jsonError, jsonOk, handleRouteError } from "@/lib/server/api";
import { getPrisma } from "@/lib/server/db";
import { hashPassword } from "@/lib/server/password";
import { consumeOneTimeToken } from "@/lib/server/tokens";
import { resetPasswordSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const input = resetPasswordSchema.parse(await request.json());
    const record = await consumeOneTimeToken(input.token, "PASSWORD_RESET");
    if (!record) return jsonError("Link inválido ou expirado.", 400);

    await getPrisma().user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(input.password) },
    });
    await auditLog({ userId: record.userId, action: "auth.password_reset", entity: "user", entityId: record.userId });

    return jsonOk({ reset: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
