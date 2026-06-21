import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { auditLog } from "@/lib/server/audit";
import { ApiError, handleRouteError, jsonOk } from "@/lib/server/api";
import { requireApiUser } from "@/lib/server/api-auth";
import { getPrisma } from "@/lib/server/db";
import { supportReplyEmail } from "@/lib/server/email-templates";
import { sendTransactionalEmail } from "@/lib/server/mail";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { supportReplySchema, supportTicketSchema } from "@/lib/validation";

type SupportMessage = {
  role: string;
  author: string;
  body: string;
  createdAt: string;
};

function messagesFrom(value: unknown): SupportMessage[] {
  return Array.isArray(value)
    ? value.filter((item): item is SupportMessage => {
        const message = item as Partial<SupportMessage>;
        return typeof message.body === "string" && typeof message.createdAt === "string";
      })
    : [];
}

export async function GET() {
  try {
    const user = await requireApiUser();
    const prisma = getPrisma();
    const tickets = await prisma.supportTicket.findMany({
      where: user.role === "ADMIN" ? undefined : { userId: user.id },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { updatedAt: "desc" },
      take: user.role === "ADMIN" ? 50 : 10,
    });

    return jsonOk({
      tickets: tickets.map((ticket) => ({
        ...ticket,
        messages: messagesFrom(ticket.messages),
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser();
    const input = supportTicketSchema.parse(await request.json());
    const rate = await checkRateLimit({
      key: user.id,
      action: "support_ticket",
      limit: 8,
      windowSeconds: 60 * 60,
    });
    if (!rate.allowed) throw new ApiError("Muitas mensagens de suporte. Tente novamente mais tarde.", 429);

    const message: SupportMessage = {
      role: user.role,
      author: user.name,
      body: input.message,
      createdAt: new Date().toISOString(),
    };
    const ticket = await getPrisma().supportTicket.create({
      data: {
        userId: user.id,
        subject: input.subject,
        messages: [message] as Prisma.InputJsonValue,
      },
      include: { user: { select: { name: true, email: true } } },
    });

    await auditLog({ userId: user.id, action: "support.ticket_created", entity: "supportTicket", entityId: ticket.id });
    return jsonOk({ ticket: { ...ticket, messages: messagesFrom(ticket.messages) } });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireApiUser();
    if (user.role !== "ADMIN") throw new ApiError("Permissão insuficiente.", 403);

    const input = supportReplySchema.parse(await request.json());
    const prisma = getPrisma();
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: input.ticketId },
      include: { user: { select: { name: true, email: true } } },
    });
    if (!ticket) throw new ApiError("Chamado não encontrado.", 404);

    const messages = messagesFrom(ticket.messages);
    if (input.message) {
      messages.push({
        role: user.role,
        author: user.name,
        body: input.message,
        createdAt: new Date().toISOString(),
      });
    }

    const updated = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: input.status ?? (input.message ? "answered" : ticket.status),
        messages: messages as Prisma.InputJsonValue,
      },
      include: { user: { select: { name: true, email: true } } },
    });

    // Notifica o aluno por e-mail quando o admin responde (best-effort).
    if (input.message && updated.user?.email) {
      try {
        await sendTransactionalEmail({ userId: ticket.userId, to: updated.user.email, ...supportReplyEmail(updated.user.name, updated.subject, input.message) });
      } catch (error) {
        console.error("support reply email failed", { ticketId: ticket.id, error: error instanceof Error ? error.message : "unknown" });
      }
    }

    await auditLog({ userId: user.id, action: "support.ticket_updated", entity: "supportTicket", entityId: ticket.id });
    return jsonOk({ ticket: { ...updated, messages: messagesFrom(updated.messages) } });
  } catch (error) {
    return handleRouteError(error);
  }
}
