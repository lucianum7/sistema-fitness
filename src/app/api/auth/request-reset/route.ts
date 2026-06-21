import { NextRequest } from "next/server";
import { auditLog } from "@/lib/server/audit";
import { jsonError, jsonOk, handleRouteError } from "@/lib/server/api";
import { hashIp } from "@/lib/server/crypto";
import { getPrisma } from "@/lib/server/db";
import { newPasswordEmail } from "@/lib/server/email-templates";
import { sendTransactionalEmail } from "@/lib/server/mail";
import { generateTemporaryPassword, hashPassword } from "@/lib/server/password";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { getClientIp } from "@/lib/server/request";
import { requestResetSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const input = requestResetSchema.parse(await request.json());
    const ipHash = hashIp(getClientIp(request));
    const rate = await checkRateLimit({ key: `${ipHash}:${input.email}`, action: "reset", limit: 4, windowSeconds: 60 * 60 });
    if (!rate.allowed) return jsonError("Muitas tentativas. Tente novamente mais tarde.", 429);

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    if (user?.isActive && !user.deletedAt) {
      const newPassword = generateTemporaryPassword();
      const mail = newPasswordEmail(user.name, newPassword);
      try {
        // Só troca a senha DEPOIS que o e-mail sai, para nunca trancar o usuário
        // caso o envio falhe.
        await sendTransactionalEmail({ userId: user.id, to: user.email, ...mail });
        await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
        await auditLog({ userId: user.id, action: "auth.password_reset_emailed", entity: "user", entityId: user.id, ipHash });
      } catch (error) {
        console.error("reset email failed", { userId: user.id, error: error instanceof Error ? error.message : "unknown" });
      }
    }

    // Resposta genérica (anti-enumeração de e-mails).
    return jsonOk({ sent: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
