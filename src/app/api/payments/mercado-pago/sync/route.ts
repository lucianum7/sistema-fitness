import { z } from "zod";
import { auditLog } from "@/lib/server/audit";
import { ApiError, handleRouteError, jsonOk } from "@/lib/server/api";
import { requireApiUser } from "@/lib/server/api-auth";
import { getPrisma } from "@/lib/server/db";
import {
  applyMercadoPagoResource,
  fetchMercadoPagoResource,
  findPaymentByExternalReference,
} from "@/lib/server/mercado-pago";
import { checkRateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

const syncSchema = z.object({
  paymentId: z.string().trim().min(1).max(100).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const input = syncSchema.parse(await request.json().catch(() => ({})));
    const rate = await checkRateLimit({
      key: user.id,
      action: "mercado_pago_sync",
      limit: 8,
      windowSeconds: 60 * 15,
    });
    if (!rate.allowed) throw new ApiError("Aguarde alguns minutos antes de consultar novamente.", 429);

    let resource;
    if (input.paymentId) {
      resource = await fetchMercadoPagoResource("payment", input.paymentId);
    } else {
      const pending = await getPrisma().payment.findFirst({
        where: { userId: user.id, provider: "mercado_pago", status: "pending" },
        orderBy: { createdAt: "desc" },
      });
      if (!pending) throw new ApiError("Nenhum pagamento pendente encontrado.", 404);

      if (pending.mode === "recurring" && pending.checkoutRef) {
        resource = await fetchMercadoPagoResource("preapproval", pending.checkoutRef);
      } else if (pending.externalReference) {
        const found = await findPaymentByExternalReference(pending.externalReference);
        if (!found) return jsonOk({ status: pending.status, pending: true });
        resource = await fetchMercadoPagoResource("payment", String(found.id));
      } else {
        throw new ApiError("Pagamento sem referencia para consulta.", 422);
      }
    }

    const result = await applyMercadoPagoResource(resource, user.id);
    await auditLog({
      userId: user.id,
      action: "payment.mercado_pago_synced",
      entity: "payment",
      entityId: result.payment.id,
      metadata: { status: result.payment.status, mode: result.payment.mode },
    });
    return jsonOk({
      status: result.payment.status,
      subscriptionStatus: result.subscriptionStatus,
      pending: result.payment.status === "pending",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
