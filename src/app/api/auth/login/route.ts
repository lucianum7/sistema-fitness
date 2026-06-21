import { NextRequest } from "next/server";
import { auditLog } from "@/lib/server/audit";
import { jsonError, jsonOk, handleRouteError } from "@/lib/server/api";
import { hashIp } from "@/lib/server/crypto";
import { getPrisma } from "@/lib/server/db";
import { verifyPassword } from "@/lib/server/password";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { getClientIp } from "@/lib/server/request";
import { setSessionCookie } from "@/lib/server/session";
import { loginSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const input = loginSchema.parse(await request.json());
    const ipHash = hashIp(getClientIp(request));
    const rate = await checkRateLimit({
      key: `${ipHash}:${input.email}`,
      action: "login",
      limit: 8,
      windowSeconds: 15 * 60,
    });

    if (!rate.allowed) return jsonError("Muitas tentativas. Aguarde alguns minutos.", 429);

    const user = await getPrisma().user.findUnique({ where: { email: input.email } });
    const valid = user ? await verifyPassword(input.password, user.passwordHash) : false;
    if (!user || !valid || !user.isActive || user.deletedAt) {
      return jsonError("E-mail ou senha inválidos.", 401);
    }

    await setSessionCookie({ userId: user.id, email: user.email, name: user.name, role: user.role });
    await auditLog({ userId: user.id, action: "auth.login", entity: "user", entityId: user.id, ipHash });

    return jsonOk({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: Boolean(user.emailVerifiedAt),
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
