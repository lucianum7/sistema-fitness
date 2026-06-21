ALTER TABLE "Payment"
ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'mercado_pago',
ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'card',
ADD COLUMN "rawStatus" TEXT,
ADD COLUMN "checkoutRef" TEXT,
ADD COLUMN "externalReference" TEXT,
ADD COLUMN "paidAt" TIMESTAMP(3),
ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "PaymentWebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "resourceId" TEXT,
  "signatureValid" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'received',
  "payload" JSONB NOT NULL DEFAULT '{}',
  "error" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Payment_externalReference_key" ON "Payment"("externalReference");
CREATE INDEX "Payment_providerRef_idx" ON "Payment"("providerRef");
CREATE INDEX "Payment_checkoutRef_idx" ON "Payment"("checkoutRef");
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");
CREATE UNIQUE INDEX "PaymentWebhookEvent_provider_eventId_key" ON "PaymentWebhookEvent"("provider", "eventId");
CREATE INDEX "PaymentWebhookEvent_status_receivedAt_idx" ON "PaymentWebhookEvent"("status", "receivedAt");
