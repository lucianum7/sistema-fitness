import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Mercado Pago", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.DATABASE_URL = "postgresql://sistema-fitness:test@localhost:5432/sistema-fitness";
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = "segredo-de-teste-webhook";
  });

  it("extrai apenas referencias externas do Sistema Fitness", async () => {
    const { getUserIdFromExternalReference } = await import("./mercado-pago");

    expect(getUserIdFromExternalReference("sistema-fitness-user_123-1718800000000")).toBe("user_123");
    expect(getUserIdFromExternalReference("pedido-externo-123")).toBeNull();
  });

  it("valida a assinatura oficial do webhook", async () => {
    const { verifyMercadoPagoSignature } = await import("./mercado-pago");
    const dataId = "987654";
    const requestId = "request-abc";
    const ts = "1718800000";
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const signature = createHmac("sha256", process.env.MERCADO_PAGO_WEBHOOK_SECRET!)
      .update(manifest)
      .digest("hex");

    expect(verifyMercadoPagoSignature({
      signature: `ts=${ts},v1=${signature}`,
      requestId,
      dataId,
    })).toBe(true);
    expect(verifyMercadoPagoSignature({
      signature: `ts=${ts},v1=${"0".repeat(64)}`,
      requestId,
      dataId,
    })).toBe(false);
  });
});
