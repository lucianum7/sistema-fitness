import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { auditLog } from "@/lib/server/audit";
import { jsonError, jsonOk } from "@/lib/server/api";
import { getPrisma } from "@/lib/server/db";
import { getEnv } from "@/lib/server/env";
import {
  applyMercadoPagoResource,
  fetchMercadoPagoResource,
  verifyMercadoPagoSignature,
} from "@/lib/server/mercado-pago";

export const runtime = "nodejs";

type WebhookPayload = {
  id?: string | number;
  type?: string;
  action?: string;
  data?: { id?: string | number };
};

function resourceKind(type: string, action: string) {
  const topic = `${type} ${action}`.toLowerCase();
  if (topic.includes("preapproval") || topic.includes("subscription")) return "preapproval" as const;
  if (topic.includes("payment")) return "payment" as const;
  return null;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (rawBody.length > 64_000) return jsonError("Payload excede o limite permitido.", 413);

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody || "{}") as WebhookPayload;
  } catch {
    return jsonError("Payload invalido.", 400);
  }

  const resourceId = String(payload.data?.id ?? request.nextUrl.searchParams.get("data.id") ?? "");
  const type = payload.type ?? request.nextUrl.searchParams.get("type") ?? request.nextUrl.searchParams.get("topic") ?? "unknown";
  const action = payload.action ?? request.nextUrl.searchParams.get("action") ?? "unknown";
  const requestId = request.headers.get("x-request-id");
  const signatureValid = verifyMercadoPagoSignature({
    signature: request.headers.get("x-signature"),
    requestId,
    dataId: resourceId || null,
  });
  const env = getEnv();

  if (env.MERCADO_PAGO_WEBHOOK_SECRET && !signatureValid) {
    return jsonError("Assinatura do webhook invalida.", 401);
  }
  if (env.NODE_ENV === "production" && !env.MERCADO_PAGO_WEBHOOK_SECRET) {
    return jsonError("Webhook do Mercado Pago nao configurado.", 503);
  }
  if (!resourceId) return jsonError("Recurso nao informado.", 400);

  const kind = resourceKind(type, action);
  const eventId = String(payload.id ?? `${type}:${resourceId}:${requestId ?? "sem-request-id"}`);
  const prisma = getPrisma();
  let event: { id: string };

  try {
    event = await prisma.paymentWebhookEvent.create({
      data: {
        provider: "mercado_pago",
        eventId,
        eventType: `${type}:${action}`,
        resourceId,
        signatureValid,
        payload: payload as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonOk({ received: true, duplicate: true });
    }
    console.error("Mercado Pago webhook event persistence failed", { type, resourceId });
    return jsonError("Falha ao registrar o evento.", 500);
  }

  if (!kind) {
    await prisma.paymentWebhookEvent.update({
      where: { id: event.id },
      data: { status: "ignored", processedAt: new Date() },
    });
    return jsonOk({ received: true, ignored: true });
  }

  try {
    const result = await applyMercadoPagoResource(await fetchMercadoPagoResource(kind, resourceId));
    await prisma.paymentWebhookEvent.update({
      where: { id: event.id },
      data: { status: "processed", processedAt: new Date() },
    });
    await auditLog({
      userId: result.userId,
      action: "payment.mercado_pago_webhook_processed",
      entity: "payment",
      entityId: result.payment.id,
      metadata: { eventId, type, action, signatureValid },
    });
    return jsonOk({ received: true });
  } catch (error) {
    await prisma.paymentWebhookEvent.update({
      where: { id: event.id },
      data: {
        status: "error",
        error: error instanceof Error ? error.message.slice(0, 500) : "Erro desconhecido",
      },
    });
    console.error("Mercado Pago webhook processing failed", { type, resourceId });
    return jsonError("Falha ao processar o evento.", 500);
  }
}
