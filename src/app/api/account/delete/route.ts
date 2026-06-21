import { NextRequest } from "next/server";
import { auditLog } from "@/lib/server/audit";
import { jsonOk, handleRouteError } from "@/lib/server/api";
import { requireApiUser } from "@/lib/server/api-auth";
import { getPrisma } from "@/lib/server/db";
import { clearSessionCookie } from "@/lib/server/session";

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser();
    const body = await request.json().catch(() => ({}));
    if (body.confirm !== "EXCLUIR") {
      return new Response(JSON.stringify({ ok: false, error: "Confirmação inválida." }), {
        status: 422,
        headers: { "content-type": "application/json" },
      });
    }

    await getPrisma().user.update({
      where: { id: user.id },
      data: { isActive: false, deletedAt: new Date(), email: `deleted-${user.id}@sistema-fitness.local` },
    });
    await auditLog({ userId: user.id, action: "account.deleted", entity: "user", entityId: user.id });
    await clearSessionCookie();
    return jsonOk({ deleted: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
