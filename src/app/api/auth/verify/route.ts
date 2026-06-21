import { NextRequest } from "next/server";
import { auditLog } from "@/lib/server/audit";
import { jsonError, jsonOk, handleRouteError } from "@/lib/server/api";
import { getPrisma } from "@/lib/server/db";
import { consumeOneTimeToken } from "@/lib/server/tokens";
import { tokenSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const input = tokenSchema.parse(await request.json());
    const record = await consumeOneTimeToken(input.token, "EMAIL_VERIFY");
    if (!record) return jsonError("Link inválido ou expirado.", 400);

    await getPrisma().user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    });
    await auditLog({ userId: record.userId, action: "auth.email_verified", entity: "user", entityId: record.userId });

    return jsonOk({ verified: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
