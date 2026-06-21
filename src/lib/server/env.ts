import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32).optional(),
  APP_URL: z.string().url().default("http://localhost:3000"),
  ADMIN_EMAIL: z.string().trim().email().toLowerCase().optional(),
  ADMIN_INITIAL_PASSWORD: z.string().min(1).optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().default("Sistema Fitness <no-reply@localhost>"),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().default("Sistema Fitness <no-reply@localhost>"),
  MERCADO_PAGO_PUBLIC_KEY: z.string().optional(),
  MERCADO_PAGO_ACCESS_TOKEN: z.string().optional(),
  MERCADO_PAGO_CLIENT_ID: z.string().optional(),
  MERCADO_PAGO_CLIENT_SECRET: z.string().optional(),
  MERCADO_PAGO_WEBHOOK_SECRET: z.string().optional(),
  MERCADO_PAGO_BACK_URL: z.string().url().optional(),
  Public_Key: z.string().optional(),
  Access_Token: z.string().optional(),
  Client_ID: z.string().optional(),
  Client_Secret: z.string().optional(),
  SECRET_WEBHOOK: z.string().optional(),
  BACKUP_DIR: z.string().default("./backups"),
  BACKUP_RETENTION_DAYS: z.coerce.number().default(14),
  NODE_ENV: z.string().default("development"),
});

let cachedEnv: z.infer<typeof envSchema> | null = null;

export function getEnv() {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.parse(process.env);
  if (parsed.NODE_ENV === "production" && !parsed.SESSION_SECRET) {
    throw new Error("SESSION_SECRET precisa estar configurado em produção.");
  }

  // Escolhe o primeiro valor não-vazio: trata "" como ausente. Assim uma env var
  // vazia (ex.: MERCADO_PAGO_WEBHOOK_SECRET="") não vence o alias preenchido (SECRET_WEBHOOK).
  const pick = (...values: (string | undefined)[]) => values.find((value) => value != null && value !== "");

  cachedEnv = {
    ...parsed,
    SESSION_SECRET: pick(parsed.SESSION_SECRET) ?? "sistema-fitness-development-session-secret-change-me",
    MERCADO_PAGO_PUBLIC_KEY: pick(parsed.MERCADO_PAGO_PUBLIC_KEY, parsed.Public_Key),
    MERCADO_PAGO_ACCESS_TOKEN: pick(parsed.MERCADO_PAGO_ACCESS_TOKEN, parsed.Access_Token),
    MERCADO_PAGO_CLIENT_ID: pick(parsed.MERCADO_PAGO_CLIENT_ID, parsed.Client_ID),
    MERCADO_PAGO_CLIENT_SECRET: pick(parsed.MERCADO_PAGO_CLIENT_SECRET, parsed.Client_Secret),
    MERCADO_PAGO_WEBHOOK_SECRET: pick(parsed.MERCADO_PAGO_WEBHOOK_SECRET, parsed.SECRET_WEBHOOK),
  };

  return cachedEnv;
}
