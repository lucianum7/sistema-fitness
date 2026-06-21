import { createHmac, timingSafeEqual } from "node:crypto";
import { addMonths } from "date-fns";
import { Prisma } from "../../generated/prisma/client";
import { ApiError } from "./api";
import { getPrisma } from "./db";
import { paymentConfirmedEmail } from "./email-templates";
import { getEnv } from "./env";
import { sendTransactionalEmail } from "./mail";

export const FITNESS_MONTHLY_AMOUNT = 27.77;
export const FITNESS_MONTHLY_AMOUNT_CENTS = 2777;

type MercadoPagoPayment = {
  id: number | string;
  status?: string;
  status_detail?: string;
  external_reference?: string | null;
  transaction_amount?: number;
  currency_id?: string;
  date_approved?: string | null;
  metadata?: Record<string, unknown>;
};

type MercadoPagoPreapproval = {
  id: string;
  status?: string;
  external_reference?: string | null;
  next_payment_date?: string | null;
  auto_recurring?: {
    transaction_amount?: number;
    currency_id?: string;
  };
};

type MercadoPagoSearch = {
  results?: MercadoPagoPayment[];
};

type MercadoPagoResource =
  | { kind: "payment"; data: MercadoPagoPayment }
  | { kind: "preapproval"; data: MercadoPagoPreapproval };

function safeJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

export async function mercadoPagoRequest<T>(path: string, init: RequestInit = {}) {
  const token = getEnv().MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) throw new ApiError("Mercado Pago nao configurado no servidor.", 503);

  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await response.json().catch(() => ({}))) as T & { message?: string };

  if (!response.ok) {
    console.error("Mercado Pago request failed", { path, status: response.status });
    throw new ApiError(data.message || "Nao foi possivel consultar o Mercado Pago.", 502);
  }

  return data;
}

export function getUserIdFromExternalReference(reference?: string | null) {
  if (!reference?.startsWith("sistema-fitness-")) return null;
  const match = /^sistema-fitness-(.+)-(\d+)$/.exec(reference);
  return match?.[1] ?? null;
}

export function verifyMercadoPagoSignature(input: {
  signature: string | null;
  requestId: string | null;
  dataId: string | null;
}) {
  const secret = getEnv().MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret || !input.signature || !input.requestId || !input.dataId) return false;

  const parts = Object.fromEntries(
    input.signature.split(",").map((part) => {
      const [key, ...value] = part.trim().split("=");
      return [key, value.join("=")];
    }),
  );
  if (!parts.ts || !parts.v1 || !/^\d+$/.test(parts.ts)) return false;

  const dataId = input.dataId.toLowerCase();
  const manifest = `id:${dataId};request-id:${input.requestId};ts:${parts.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const received = parts.v1.toLowerCase();
  if (expected.length !== received.length) return false;

  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export async function fetchMercadoPagoResource(kind: "payment" | "preapproval", resourceId: string): Promise<MercadoPagoResource> {
  if (kind === "payment") {
    return { kind, data: await mercadoPagoRequest<MercadoPagoPayment>(`/v1/payments/${encodeURIComponent(resourceId)}`) };
  }
  return { kind, data: await mercadoPagoRequest<MercadoPagoPreapproval>(`/preapproval/${encodeURIComponent(resourceId)}`) };
}

export async function findPaymentByExternalReference(externalReference: string) {
  const search = new URLSearchParams({
    external_reference: externalReference,
    sort: "date_created",
    criteria: "desc",
    limit: "1",
  });
  const data = await mercadoPagoRequest<MercadoPagoSearch>(`/v1/payments/search?${search}`);
  return data.results?.[0] ?? null;
}

function localPaymentStatus(status?: string) {
  if (status === "approved" || status === "authorized") return "approved";
  if (status === "refunded" || status === "charged_back") return status;
  if (["rejected", "cancelled", "paused"].includes(status ?? "")) return "failed";
  return "pending";
}

function subscriptionStatus(status?: string) {
  if (status === "approved" || status === "authorized") return "ACTIVE" as const;
  if (status === "cancelled") return "CANCELED" as const;
  if (["rejected", "paused", "refunded", "charged_back"].includes(status ?? "")) return "PAST_DUE" as const;
  return null;
}

function dateOrNull(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function applyMercadoPagoResource(resource: MercadoPagoResource, expectedUserId?: string) {
  const prisma = getPrisma();
  const externalReference = resource.data.external_reference ?? null;
  const referencedUserId = getUserIdFromExternalReference(externalReference);
  const metadataUserId = resource.kind === "payment" && typeof resource.data.metadata?.user_id === "string"
    ? resource.data.metadata.user_id
    : resource.kind === "payment" && typeof resource.data.metadata?.userId === "string"
      ? resource.data.metadata.userId
      : null;

  const localPayment = await prisma.payment.findFirst({
    where: {
      OR: [
        ...(externalReference ? [{ externalReference }] : []),
        { providerRef: String(resource.data.id) },
        { checkoutRef: String(resource.data.id) },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
  const userId = localPayment?.userId ?? referencedUserId ?? metadataUserId;
  if (!userId) throw new ApiError("Pagamento sem vinculo com uma conta Sistema Fitness.", 422);
  if (expectedUserId && userId !== expectedUserId) throw new ApiError("Pagamento nao pertence a esta conta.", 403);

  const rawStatus = resource.data.status ?? "unknown";
  const status = localPaymentStatus(rawStatus);
  const approvedAt = resource.kind === "payment" ? dateOrNull(resource.data.date_approved) : null;
  const amount = resource.kind === "payment"
    ? resource.data.transaction_amount
    : resource.data.auto_recurring?.transaction_amount;
  const amountCents = Math.round((amount ?? FITNESS_MONTHLY_AMOUNT) * 100);
  const currency = resource.kind === "payment"
    ? resource.data.currency_id ?? "BRL"
    : resource.data.auto_recurring?.currency_id ?? "BRL";
  const providerRef = String(resource.data.id);
  const mode = resource.kind === "preapproval" ? "recurring" : localPayment?.mode ?? "card";

  const payment = localPayment
    ? await prisma.payment.update({
        where: { id: localPayment.id },
        data: {
          amountCents,
          currency,
          mode,
          status,
          rawStatus,
          providerRef,
          externalReference: externalReference ?? localPayment.externalReference,
          paidAt: approvedAt ?? localPayment.paidAt,
          metadata: safeJsonValue(resource.data),
        },
      })
    : await prisma.payment.create({
        data: {
          userId,
          amountCents,
          currency,
          mode,
          status,
          rawStatus,
          providerRef,
          externalReference,
          paidAt: approvedAt,
          metadata: safeJsonValue(resource.data),
        },
      });

  const nextSubscriptionStatus = subscriptionStatus(rawStatus);
  if (nextSubscriptionStatus) {
    const now = approvedAt ?? new Date();
    const periodEnd = resource.kind === "preapproval"
      ? dateOrNull(resource.data.next_payment_date) ?? addMonths(now, 1)
      : addMonths(now, 1);

    await prisma.subscription.upsert({
      where: { userId },
      update: {
        planName: "Sistema Fitness Performance",
        status: nextSubscriptionStatus,
        ...(nextSubscriptionStatus === "ACTIVE" ? { currentPeriodStart: now, currentPeriodEnd: periodEnd } : {}),
        ...(resource.kind === "preapproval" ? { providerRef } : {}),
      },
      create: {
        userId,
        planName: "Sistema Fitness Performance",
        status: nextSubscriptionStatus,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        providerRef: resource.kind === "preapproval" ? providerRef : null,
      },
    });
  }

  // E-mail de confirmação apenas na transição para "approved" (dedup webhook/sync). Best-effort.
  if (status === "approved" && localPayment?.status !== "approved") {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
      const sub = await prisma.subscription.findUnique({ where: { userId }, select: { currentPeriodEnd: true } });
      if (user) {
        await sendTransactionalEmail({ userId, to: user.email, ...paymentConfirmedEmail(user.name, sub?.currentPeriodEnd ?? null) });
      }
    } catch (error) {
      console.error("payment confirmed email failed", { userId, error: error instanceof Error ? error.message : "unknown" });
    }
  }

  return { payment, userId, subscriptionStatus: nextSubscriptionStatus };
}
