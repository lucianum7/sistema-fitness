import { NextRequest } from "next/server";
import { addDays } from "date-fns";
import { auditLog } from "@/lib/server/audit";
import { jsonError, jsonOk, handleRouteError } from "@/lib/server/api";
import { hashIp } from "@/lib/server/crypto";
import { getPrisma } from "@/lib/server/db";
import { sendTransactionalEmail } from "@/lib/server/mail";
import { welcomeEmail } from "@/lib/server/email-templates";
import { hashPassword } from "@/lib/server/password";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { getClientIp, getUserAgent } from "@/lib/server/request";
import { setSessionCookie } from "@/lib/server/session";
import { registerSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const input = registerSchema.parse(await request.json());
    const ipHash = hashIp(getClientIp(request));
    const rate = await checkRateLimit({
      key: `${ipHash}:${input.email}`,
      action: "register",
      limit: 5,
      windowSeconds: 60 * 60,
    });

    if (!rate.allowed) return jsonError("Muitas tentativas. Tente novamente mais tarde.", 429);

    const prisma = getPrisma();
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) return jsonError("Este e-mail já está cadastrado.", 409);

    const passwordHash = await hashPassword(input.password);

    // Conta enxuta com 2 dias de acesso completo (trial). O perfil (avaliação) e os
    // planos são criados depois, já dentro da sessão.
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        emailVerifiedAt: new Date(),
        consents: {
          create: [
            { type: "TERMS", version: "2026-06", ipHash, userAgent: getUserAgent(request) },
            { type: "PRIVACY", version: "2026-06", ipHash, userAgent: getUserAgent(request) },
          ],
        },
        subscription: {
          create: {
            planName: "Sistema Fitness Essencial",
            status: "TRIAL",
            currentPeriodEnd: addDays(new Date(), 2),
          },
        },
      },
    });

    // Sessão é criada imediatamente: o cadastro NUNCA depende do envio de e-mail.
    await setSessionCookie({ userId: user.id, email: user.email, name: user.name, role: user.role });
    await auditLog({ userId: user.id, action: "auth.register", entity: "user", entityId: user.id, ipHash });

    // E-mail de boas-vindas é best-effort: se o provedor falhar, o cadastro segue normal.
    try {
      const mail = welcomeEmail(user.name);
      await sendTransactionalEmail({ userId: user.id, to: user.email, ...mail });
    } catch (error) {
      console.error("welcome email failed", { userId: user.id, error: error instanceof Error ? error.message : "unknown" });
    }

    return jsonOk({
      user: { id: user.id, name: user.name, email: user.email, emailVerified: true },
      needsProfile: true,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
