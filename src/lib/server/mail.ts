import nodemailer from "nodemailer";
import { getEnv } from "./env";
import { getPrisma } from "./db";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  const env = getEnv();
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
      },
    });
  }

  return transporter;
}

export type EmailAttachment = { filename: string; content: Buffer };

export async function sendTransactionalEmail(input: {
  userId: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: EmailAttachment[];
}) {
  const env = getEnv();
  if (env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: env.RESEND_FROM,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
        ...(input.attachments?.length
          ? { attachments: input.attachments.map((file) => ({ filename: file.filename, content: file.content.toString("base64") })) }
          : {}),
      }),
    });

    if (!response.ok) {
      console.error("Resend email delivery failed", { status: response.status });
      throw new Error("Falha ao enviar e-mail pelo Resend.");
    }

    return { delivered: true, provider: "resend" as const };
  }

  const smtp = getTransporter();

  if (smtp) {
    await smtp.sendMail({
      from: env.SMTP_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      ...(input.attachments?.length ? { attachments: input.attachments.map((file) => ({ filename: file.filename, content: file.content })) } : {}),
    });
    return { delivered: true, provider: "smtp" as const };
  }

  if (env.NODE_ENV !== "production") {
    await getPrisma().notification.create({
      data: {
        userId: input.userId,
        title: `Dev: ${input.subject}`,
        body: input.text,
      },
    });
    return { delivered: false, provider: "dev-notification" as const };
  }

  throw new Error("SMTP não configurado.");
}
