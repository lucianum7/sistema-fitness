import { AdminPanel } from "@/components/admin-panel";
import { requireAdmin } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/db";
import { getEnv } from "@/lib/server/env";

function daysUntil(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default async function AdminPage() {
  await requireAdmin();
  const prisma = getPrisma();
  const [users, paymentRows, students, activeSubscriptions, pendingPayments, approvedRevenue, webhookErrors, lastWebhook, ticketRows] = await Promise.all([
    prisma.user.findMany({
      where: { deletedAt: null },
      include: { subscription: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.payment.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.user.count({ where: { role: "STUDENT", deletedAt: null } }),
    prisma.subscription.count({ where: { status: "ACTIVE", currentPeriodEnd: { gte: new Date() } } }),
    prisma.payment.count({ where: { status: "pending" } }),
    prisma.payment.aggregate({ where: { status: "approved" }, _sum: { amountCents: true } }),
    prisma.paymentWebhookEvent.count({ where: { status: "error" } }),
    prisma.paymentWebhookEvent.findFirst({ orderBy: { receivedAt: "desc" }, select: { receivedAt: true } }),
    prisma.supportTicket.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  function ticketMessages(value: unknown) {
    return Array.isArray(value)
      ? value.flatMap((item) => {
          const message = item as { author?: unknown; body?: unknown; createdAt?: unknown };
          return typeof message.body === "string"
            ? [{ author: typeof message.author === "string" ? message.author : "—", body: message.body, createdAt: typeof message.createdAt === "string" ? message.createdAt : "" }]
            : [];
        })
      : [];
  }

  const paidUsers = users.filter((user) => user.subscription?.status === "ACTIVE");
  const dueSoon = paidUsers.filter((user) => {
    const end = user.subscription?.currentPeriodEnd;
    if (!end) return false;
    const remainingDays = daysUntil(end);
    return remainingDays >= 0 && remainingDays <= 7;
  });
  const expiredTrials = users.filter((user) => {
    const subscription = user.subscription;
    return subscription?.status === "TRIAL" && subscription.currentPeriodEnd < new Date();
  });

  return (
    <div className="grid gap-5">
      <header>
        <p className="text-sm font-semibold text-[var(--primary)]">Operacao Sistema Fitness</p>
        <h1 className="text-3xl font-black md:text-4xl">Painel administrativo</h1>
      </header>

      <AdminPanel
        users={users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt.toISOString(),
          subscription: user.subscription
            ? {
                planName: user.subscription.planName,
                status: user.subscription.status,
                currentPeriodEnd: user.subscription.currentPeriodEnd.toISOString(),
                providerRef: user.subscription.providerRef,
              }
            : null,
        }))}
        payments={paymentRows.map((payment) => ({
          id: payment.id,
          amountCents: payment.amountCents,
          currency: payment.currency,
          status: payment.status,
          mode: payment.mode,
          rawStatus: payment.rawStatus,
          providerRef: payment.providerRef,
          paidAt: payment.paidAt?.toISOString() ?? null,
          createdAt: payment.createdAt.toISOString(),
          user: { name: payment.user.name, email: payment.user.email },
        }))}
        summary={{
          students,
          activeSubscriptions,
          dueSoon: dueSoon.length,
          expiredTrials: expiredTrials.length,
          approvedRevenueCents: approvedRevenue._sum.amountCents ?? 0,
          pendingPayments,
        }}
        tickets={ticketRows.map((ticket) => ({
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status,
          updatedAt: ticket.updatedAt.toISOString(),
          user: { name: ticket.user.name, email: ticket.user.email },
          messages: ticketMessages(ticket.messages),
        }))}
        integration={(() => {
          const env = getEnv();
          return {
            checkout: Boolean(env.MERCADO_PAGO_ACCESS_TOKEN),
            webhook: Boolean(env.MERCADO_PAGO_WEBHOOK_SECRET),
            publicUrl: env.APP_URL.startsWith("https://"),
            webhookErrors,
            lastWebhookAt: lastWebhook?.receivedAt.toISOString() ?? null,
          };
        })()}
      />
    </div>
  );
}
