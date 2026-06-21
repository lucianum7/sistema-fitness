"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, Apple, BarChart3, CreditCard, Droplets, Home, LogOut, Menu, MessageCircle, Send, Settings, Shield, Trophy, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button, Field, HelpTip, TextAreaField } from "./ui";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

const studentNav = [
  { href: "/painel", label: "Central do Aluno", shortLabel: "Central", icon: Home },
  { href: "/treinos", label: "Treinos", icon: Activity },
  { href: "/nutricao", label: "Nutrição", icon: Apple },
  { href: "/evolucao", label: "Evolução", icon: BarChart3 },
  { href: "/bem-estar", label: "Rotina", icon: Droplets },
  { href: "/relatorios", label: "Relatórios", icon: Trophy },
  { href: "/configuracoes", label: "Conta", icon: Settings },
];

const adminNav = [
  { href: "/admin", label: "Administração", icon: Shield },
  { href: "/configuracoes", label: "Conta", icon: Settings },
];

// Itens principais para a barra inferior do mobile (aluno).
const primaryNav = studentNav.slice(0, 5);

type SupportTicketPreview = {
  id: string;
  subject: string;
  status: string;
  messages: { author: string; body: string; createdAt: string }[];
};

export function AppShell({
  user,
  children,
}: {
  user: {
    name: string;
    email: string;
    role: string;
    emailVerified: boolean;
    subscription?: { status: string; currentPeriodEnd: string } | null;
  };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportSubject, setSupportSubject] = useState("Dúvida sobre meu plano");
  const [supportBody, setSupportBody] = useState("");
  const [supportStatus, setSupportStatus] = useState("");
  const [supportSending, setSupportSending] = useState(false);
  const [supportTickets, setSupportTickets] = useState<SupportTicketPreview[]>([]);
  const items = user.role === "ADMIN" ? adminNav : studentNav;
  const homeHref = user.role === "ADMIN" ? "/admin" : "/painel";
  const periodEnd = user.subscription?.currentPeriodEnd ? new Date(user.subscription.currentPeriodEnd) : null;
  const trialActive = user.subscription?.status === "TRIAL" && periodEnd !== null && periodEnd.getTime() >= Date.now();
  const paidActive = user.subscription?.status === "ACTIVE" && (periodEnd === null || periodEnd.getTime() >= Date.now());
  const accessBlocked = user.role !== "ADMIN" && !trialActive && !paidActive && pathname !== "/configuracoes";

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/entrar");
  }

  async function sendSupportMessage() {
    setSupportSending(true);
    setSupportStatus("");
    const result = await fetch("/api/support-tickets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subject: supportSubject, message: supportBody }),
    }).then((response) => response.json());
    setSupportSending(false);

    if (!result.ok) {
      setSupportStatus(result.error ?? "Não foi possível enviar a mensagem.");
      return;
    }

    setSupportBody("");
    setSupportStatus("Mensagem enviada para o admin.");
    await loadSupportTickets();
  }

  async function loadSupportTickets() {
    const result = await fetch("/api/support-tickets").then((response) => response.json());
    if (result.ok) setSupportTickets(result.data.tickets);
  }

  const menu = (
    <nav className="grid gap-2" aria-label="Navegação interna">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-[8px] px-3 text-sm font-semibold transition",
              active
                ? "bg-[color-mix(in_srgb,var(--primary),transparent_88%)] text-[var(--primary)] shadow-sm"
                : "text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]",
            )}
          >
            <item.icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-[var(--line)] bg-[var(--surface)]/88 p-5 backdrop-blur-xl lg:block">
        <div className="mb-8">
          <Logo href={homeHref} />
        </div>
        {menu}
        <div className="absolute bottom-5 left-5 right-5 grid gap-3 rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)]/70 p-3">
          <div>
            <p className="font-bold">{user.name}</p>
            <p className="break-all text-xs text-[var(--muted)]">{user.email}</p>
          </div>
          <div className="flex items-center justify-between">
            <ThemeToggle />
            <button type="button" title="Sair" aria-label="Sair" onClick={() => void logout()} className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] transition hover:border-[var(--primary)]">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--background)]/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <button type="button" aria-label="Abrir menu" onClick={() => setOpen((value) => !value)} className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--line)]">
            <Menu size={18} />
          </button>
          <Logo href={homeHref} compact />
          <ThemeToggle />
        </div>
        {open ? <div className="mt-3 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-2">{menu}</div> : null}
      </header>

      <main className="lg:pl-64">
        {!user.emailVerified ? (
          <div className="border-b border-[var(--line)] bg-[var(--gold)]/15 px-4 py-3 text-sm font-semibold text-[var(--foreground)] lg:px-8">
            Confirme seu e-mail para manter todos os recursos de segurança ativos.
          </div>
        ) : null}
        <div className="mx-auto w-full max-w-7xl px-4 pb-28 pt-7 md:px-6 lg:px-10 lg:pb-9 lg:pt-9">
          {accessBlocked ? (
            <section className="mx-auto grid max-w-2xl gap-5 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm md:p-8">
              <span className="inline-flex size-12 items-center justify-center rounded-[8px] bg-[var(--primary)] text-white">
                <CreditCard size={24} />
              </span>
              <div>
                <p className="text-sm font-bold uppercase text-[var(--primary)]">Trial encerrado</p>
                <h1 className="mt-2 text-3xl font-black">Regularize o acesso para continuar</h1>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  O Sistema Fitness libera 2 dias gratuitos. Depois desse prazo, o acesso aos treinos, cardápios e relatórios depende de pagamento ativo.
                </p>
              </div>
              <Link
                href="/configuracoes"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] bg-[var(--primary)] px-4 text-sm font-bold text-white transition hover:bg-[var(--primary-strong)]"
              >
                <CreditCard size={18} /> Ver opções de pagamento
              </Link>
            </section>
          ) : children}
        </div>
      </main>

      {user.role !== "ADMIN" ? (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-[var(--surface)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Navegação principal">
          <div className="mx-auto grid max-w-md grid-cols-5">
            {primaryNav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition",
                    active ? "text-[var(--primary)]" : "text-[var(--muted)]",
                  )}
                >
                  <item.icon size={20} />
                  {"shortLabel" in item ? item.shortLabel : item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}

      {user.role !== "ADMIN" ? (
        <>
          <button
            type="button"
            onClick={() => {
              setSupportOpen(true);
              void loadSupportTickets();
            }}
            className="fixed bottom-20 right-4 z-30 inline-flex min-h-12 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--primary)] px-4 text-sm font-bold text-white shadow-lg transition hover:bg-[var(--primary-strong)] lg:bottom-5 lg:right-5"
            aria-label="Falar com suporte"
          >
            <MessageCircle size={18} /> <span className="hidden sm:inline">Suporte</span>
          </button>

          {supportOpen ? (
            <div className="fixed inset-0 z-40 grid place-items-end bg-black/35 p-4 backdrop-blur-sm md:place-items-center">
              <section className="w-full max-w-md rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="flex items-center gap-2 text-xl font-black">
                      Falar com suporte
                      <HelpTip content="Sua mensagem cria um chamado para o admin responder pelo painel administrativo." />
                    </h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">Envie uma dúvida sobre treino, dieta, conta ou pagamento.</p>
                  </div>
                  <button type="button" aria-label="Fechar suporte" onClick={() => setSupportOpen(false)} className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--line)]">
                    <X size={18} />
                  </button>
                </div>

                <div className="mt-4 grid gap-3">
                  <Field label="Assunto" value={supportSubject} onChange={(event) => setSupportSubject(event.target.value)} />
                  <TextAreaField label="Mensagem" value={supportBody} onChange={(event) => setSupportBody(event.target.value)} placeholder="Descreva o que você precisa..." />
                  <Button type="button" onClick={() => void sendSupportMessage()} disabled={supportSending || supportBody.trim().length < 10}>
                    <Send size={16} /> Enviar mensagem
                  </Button>
                </div>
                {supportStatus ? <p className="mt-3 text-sm font-semibold text-[var(--primary)]">{supportStatus}</p> : null}
                {supportTickets.length > 0 ? (
                  <div className="mt-4 grid max-h-56 gap-2 overflow-y-auto border-t border-[var(--line)] pt-4">
                    {supportTickets.map((ticket) => {
                      const lastMessage = ticket.messages.at(-1);
                      return (
                        <div key={ticket.id} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)] p-3 text-sm">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-semibold">{ticket.subject}</p>
                            <span className="rounded-full bg-[var(--surface)] px-2 py-1 text-xs font-bold text-[var(--muted)]">{ticket.status}</span>
                          </div>
                          {lastMessage ? <p className="mt-2 text-[var(--muted)]">{lastMessage.author}: {lastMessage.body}</p> : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
