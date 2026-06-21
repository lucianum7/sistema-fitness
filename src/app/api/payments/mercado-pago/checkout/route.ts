import { NextRequest } from "next/server";
import { addDays } from "date-fns";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { auditLog } from "@/lib/server/audit";
import { ApiError, handleRouteError, jsonOk } from "@/lib/server/api";
import { requireApiUser } from "@/lib/server/api-auth";
import { getPrisma } from "@/lib/server/db";
import { getEnv } from "@/lib/server/env";
import {
  FITNESS_MONTHLY_AMOUNT,
  FITNESS_MONTHLY_AMOUNT_CENTS,
  mercadoPagoRequest,
} from "@/lib/server/mercado-pago";
import { checkRateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

const checkoutSchema = z.object({
  mode: z.enum(["recurring", "pix", "card"]).default("recurring"),
});

type MercadoPagoPreapprovalResponse = {
  id?: string;
  init_point?: string;
  status?: string;
};

type MercadoPagoPreferenceResponse = {
  id?: string;
  init_point?: string;
};

function checkoutUrls(appUrl: string, configuredBackUrl?: string) {
  const base = configuredBackUrl ?? new URL("/configuracoes", appUrl).toString();
  return Object.fromEntries(
    (["success", "pending", "failure"] as const).map((status) => {
      const url = new URL(base);
      url.searchParams.set("payment", status);
      return [status, url.toString()];
    }),
  ) as Record<"success" | "pending" | "failure", string>;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser();
    const input = checkoutSchema.parse(await request.json().catch(() => ({})));
    const env = getEnv();
    if (!env.MERCADO_PAGO_ACCESS_TOKEN) {
      throw new ApiError("Token do Mercado Pago nao configurado no servidor.", 503);
    }

    const rate = await checkRateLimit({
      key: user.id,
      action: "mercado_pago_checkout",
      limit: 5,
      windowSeconds: 60 * 15,
    });
    if (!rate.allowed) throw new ApiError("Muitas tentativas de pagamento. Tente novamente em alguns minutos.", 429);

    const externalReference = `sistema-fitness-${user.id}-${Date.now()}`;
    const backUrls = checkoutUrls(env.APP_URL, env.MERCADO_PAGO_BACK_URL);
    const publicAppUrl = new URL(env.APP_URL);
    const notificationUrl = publicAppUrl.protocol === "https:"
      ? new URL("/api/payments/mercado-pago/webhook", publicAppUrl).toString()
      : undefined;
    const requestHeaders = { "x-idempotency-key": randomUUID() };

    const payload =
      input.mode === "recurring"
        ? await (async () => {
            const data = await mercadoPagoRequest<MercadoPagoPreapprovalResponse>("/preapproval", {
              method: "POST",
              headers: requestHeaders,
              body: JSON.stringify({
                reason: "Sistema Fitness Performance",
                external_reference: externalReference,
                payer_email: user.email,
                auto_recurring: {
                  frequency: 1,
                  frequency_type: "months",
                  transaction_amount: FITNESS_MONTHLY_AMOUNT,
                  currency_id: "BRL",
                },
                back_url: backUrls.success,
                ...(notificationUrl ? { notification_url: notificationUrl } : {}),
                status: "pending",
              }),
            });
            if (!data.init_point || !data.id) {
              console.error("Mercado Pago recurring checkout missing fields", { mpStatus: data.status });
              throw new ApiError("Nao foi possivel iniciar o pagamento recorrente pelo Mercado Pago.", 502);
            }
            return { id: data.id, checkoutUrl: data.init_point, rawStatus: data.status };
          })()
        : await (async () => {
            const data = await mercadoPagoRequest<MercadoPagoPreferenceResponse>("/checkout/preferences", {
              method: "POST",
              headers: requestHeaders,
              body: JSON.stringify({
                items: [
                  {
                    id: "sistema-fitness-performance",
                    title: input.mode === "pix" ? "Sistema Fitness Performance - Pix" : "Sistema Fitness Performance - Cartao",
                    quantity: 1,
                    currency_id: "BRL",
                    unit_price: FITNESS_MONTHLY_AMOUNT,
                  },
                ],
                payer: { email: user.email, name: user.name },
                external_reference: externalReference,
                back_urls: backUrls,
                auto_return: "approved",
                metadata: { user_id: user.id, payment_mode: input.mode },
                payment_methods: input.mode === "pix"
                  ? { default_payment_method_id: "pix" }
                  : { excluded_payment_types: [{ id: "ticket" }, { id: "bank_transfer" }, { id: "atm" }] },
                ...(notificationUrl ? { notification_url: notificationUrl } : {}),
              }),
            });
            if (!data.init_point || !data.id) {
              console.error("Mercado Pago one-time checkout missing fields");
              throw new ApiError("Nao foi possivel iniciar o pagamento pelo Mercado Pago.", 502);
            }
            return { id: data.id, checkoutUrl: data.init_point, rawStatus: "pending" };
          })();

    const prisma = getPrisma();
    await prisma.$transaction([
      prisma.payment.create({
        data: {
          userId: user.id,
          amountCents: FITNESS_MONTHLY_AMOUNT_CENTS,
          currency: "BRL",
          mode: input.mode,
          status: "pending",
          rawStatus: payload.rawStatus ?? "pending",
          checkoutRef: payload.id,
          externalReference,
          metadata: { checkoutUrlCreated: true },
        },
      }),
      prisma.subscription.upsert({
        where: { userId: user.id },
        update: {
          planName: "Sistema Fitness Performance",
          ...(input.mode === "recurring" ? { providerRef: payload.id } : {}),
        },
        create: {
          userId: user.id,
          planName: "Sistema Fitness Performance",
          status: "TRIAL",
          currentPeriodEnd: addDays(new Date(), 3),
          providerRef: input.mode === "recurring" ? payload.id : null,
        },
      }),
    ]);

    await auditLog({
      userId: user.id,
      action: "payment.mercado_pago_checkout_created",
      entity: "subscription",
      entityId: payload.id,
      metadata: { amountCents: FITNESS_MONTHLY_AMOUNT_CENTS, externalReference, mode: input.mode },
    });

    return jsonOk({ checkoutUrl: payload.checkoutUrl, subscriptionId: payload.id, mode: input.mode });
  } catch (error) {
    return handleRouteError(error);
  }
}
