"use client";

import { type ComponentProps, useMemo, useState } from "react";
import {
  Activity,
  Banknote,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Download,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react";
import { Badge, Button, Field, HelpTip, SelectField } from "./ui";

type SubscriptionPreview = {
  planName: string;
  status: string;
  currentPeriodEnd: string;
  providerRef?: string | null;
} | null;

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  subscription: SubscriptionPreview;
};

type AdminPayment = {
  id: string;
  amountCents: number;
  currency: string;
  mode: string;
  status: string;
  rawStatus?: string | null;
  providerRef?: string | null;
  paidAt?: string | null;
  createdAt: string;
  user: { name: string; email: string };
};

type AdminSummary = {
  students: number;
  activeSubscriptions: number;
  dueSoon: number;
  expiredTrials: number;
  approvedRevenueCents: number;
  pendingPayments: number;
};

type IntegrationStatus = {
  checkout: boolean;
  webhook: boolean;
  publicUrl: boolean;
  webhookErrors: number;
  lastWebhookAt?: string | null;
};

type TicketMessage = { author: string; body: string; createdAt: string };
type SupportTicketView = {
  id: string;
  subject: string;
  status: string;
  updatedAt: string;
  user: { name: string; email: string };
  messages: TicketMessage[];
};

const roleOptions = ["STUDENT", "ADMIN", "COACH", "NUTRITIONIST", "SUPPORT"];
const tabs = [
  ["overview", "Visão geral", Activity],
  ["finance", "Financeiro", CircleDollarSign],
  ["users", "Usuários", Users],
  ["support", "Suporte", MessageCircle],
] as const;

function formatDate(value?: string | null) {
  if (!value) return "Sem data";
  return new Date(value).toLocaleDateString("pt-BR");
}

function formatMoney(value: number, currency = "BRL") {
  return (value / 100).toLocaleString("pt-BR", { style: "currency", currency });
}

function daysUntil(value?: string | null) {
  if (!value) return null;
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
}

function paymentLabel(status: string) {
  const labels: Record<string, string> = {
    approved: "Aprovado",
    pending: "Pendente",
    failed: "Falhou",
    refunded: "Reembolsado",
    charged_back: "Contestado",
  };
  return labels[status] ?? status;
}

const emptyNewUser = {
  name: "",
  email: "",
  age: "",
  sex: "NOT_INFORMED",
  heightCm: "",
  weightKg: "",
  objective: "RECOMPOSITION",
  activityLevel: "MODERATE",
  lifetime: false,
  consentConfirmed: false,
};

export function AdminPanel({
  users,
  payments,
  summary,
  integration,
  tickets,
}: {
  users: AdminUser[];
  payments: AdminPayment[];
  summary: AdminSummary;
  integration: IntegrationStatus;
  tickets: SupportTicketView[];
}) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number][0]>("overview");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userList, setUserList] = useState(users);
  const [creatingUser, setCreatingUser] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [ticketList, setTicketList] = useState(tickets);
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [newUser, setNewUser] = useState(emptyNewUser);
  const paidUsers = useMemo(() => userList.filter((user) => user.subscription?.status === "ACTIVE"), [userList]);
  const dueSoonUsers = useMemo(
    () => paidUsers.filter((user) => {
      const days = daysUntil(user.subscription?.currentPeriodEnd);
      return days !== null && days >= 0 && days <= 7;
    }),
    [paidUsers],
  );
  const filteredUsers = useMemo(() => userList.filter((user) => {
    const matchesQuery = `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "all"
      || (statusFilter === "active" && user.subscription?.status === "ACTIVE")
      || (statusFilter === "trial" && user.subscription?.status === "TRIAL")
      || (statusFilter === "blocked" && !user.isActive);
    return matchesQuery && matchesStatus;
  }), [query, statusFilter, userList]);

  async function updateUser(userId: string, update: { isActive?: boolean; role?: string }) {
    const result = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, ...update }),
    }).then((response) => response.json());

    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setUserList((current) => current.map((user) => (user.id === userId ? { ...user, ...update } : user)));
    setMessage("Usuário atualizado com segurança.");
  }

  async function createUser() {
    setCreatingUser(true);
    setMessage("");
    const result = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(newUser),
    }).then((response) => response.json());
    setCreatingUser(false);

    if (!result.ok) {
      setMessage(result.error ?? "Não foi possível cadastrar o aluno.");
      return;
    }

    const created = result.data.user as AdminUser;
    setUserList((current) => [created, ...current]);
    setNewUser(emptyNewUser);
    setMessage(result.data.emailSent
      ? "Aluno cadastrado. As credenciais foram enviadas por e-mail."
      : `Aluno cadastrado. Senha temporária: ${result.data.temporaryPassword}`);
  }

  async function grantLifetime(userId: string) {
    setBusyUserId(userId);
    setMessage("");
    const result = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, grantLifetime: true }),
    }).then((response) => response.json());
    setBusyUserId(null);
    if (!result.ok) {
      setMessage(result.error ?? "Não foi possível conceder o vitalício.");
      return;
    }
    setUserList((current) => current.map((user) => (user.id === userId ? { ...user, subscription: result.data.user.subscription } : user)));
    setMessage("Assinatura vitalícia concedida (sem cobrança).");
  }

  async function resetPassword(userId: string) {
    if (!window.confirm("Gerar uma nova senha e enviar por e-mail a este usuário?")) return;
    setBusyUserId(userId);
    setMessage("");
    const result = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, resetPassword: true }),
    }).then((response) => response.json());
    setBusyUserId(null);
    if (!result.ok) {
      setMessage(result.error ?? "Não foi possível redefinir a senha.");
      return;
    }
    setMessage(result.data.emailSent
      ? "Nova senha enviada por e-mail ao usuário."
      : `Nova senha gerada: ${result.data.temporaryPassword} (envie ao aluno).`);
  }

  async function deleteUser(userId: string, name: string) {
    if (!window.confirm(`Excluir ${name}? O acesso será bloqueado e o aluno sairá da lista.`)) return;
    setBusyUserId(userId);
    setMessage("");
    const result = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId }),
    }).then((response) => response.json());
    setBusyUserId(null);
    if (!result.ok) {
      setMessage(result.error ?? "Não foi possível excluir.");
      return;
    }
    setUserList((current) => current.filter((user) => user.id !== userId));
    setMessage("Aluno excluído.");
  }

  async function sendTicketUpdate(ticketId: string, payload: { message?: string; status?: string }) {
    const result = await fetch("/api/support-tickets", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ticketId, ...payload }),
    }).then((response) => response.json());
    if (!result.ok) {
      setMessage(result.error ?? "Não foi possível atualizar o chamado.");
      return;
    }
    const updated = result.data.ticket as SupportTicketView;
    setTicketList((current) => current.map((ticket) => (ticket.id === ticketId ? { ...ticket, status: updated.status, messages: updated.messages, updatedAt: updated.updatedAt } : ticket)));
    setReplyText("");
    setReplyFor(null);
  }

  const mrrCents = summary.activeSubscriptions * 2777;

  return (
    <div className="grid gap-5">
      <div className="flex gap-1 overflow-x-auto rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-1" role="tablist" aria-label="Seções administrativas">
        {tabs.map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={activeTab === value}
            onClick={() => setActiveTab(value)}
            className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-[6px] px-4 text-sm font-semibold transition ${activeTab === value ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]"}`}
          >
            <Icon size={17} /> {label}
          </button>
        ))}
      </div>

      {message ? <p className="flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3 text-sm font-semibold"><CheckCircle2 size={17} className="text-[var(--primary)]" /> {message}</p> : null}

      {activeTab === "overview" ? (
        <div className="grid gap-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard icon={Users} label="Alunos" value={String(summary.students)} detail="Contas cadastradas" />
            <SummaryCard icon={ShieldCheck} label="Assinaturas ativas" value={String(summary.activeSubscriptions)} detail={`${summary.dueSoon} vencem em até 7 dias`} />
            <SummaryCard icon={WalletCards} label="Receita recorrente" value={formatMoney(mrrCents)} detail="Estimativa mensal atual" />
            <SummaryCard icon={CalendarClock} label="Trials expirados" value={String(summary.expiredTrials)} detail="Aguardando regularização" />
          </section>

          <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="soft-card rounded-[8px] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-bold">Próximos vencimentos</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">Assinaturas que pedem atenção nesta semana.</p>
                </div>
                <Badge>{dueSoonUsers.length}</Badge>
              </div>
              <div className="mt-4 divide-y divide-[var(--line)]">
                {dueSoonUsers.length === 0 ? <p className="py-5 text-sm text-[var(--muted)]">Nenhum vencimento nos próximos 7 dias.</p> : null}
                {dueSoonUsers.slice(0, 8).map((user) => (
                  <div key={user.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                    <div className="min-w-0"><p className="truncate font-semibold">{user.name}</p><p className="truncate text-xs text-[var(--muted)]">{user.email}</p></div>
                    <div className="shrink-0 text-right"><p className="font-bold">{daysUntil(user.subscription?.currentPeriodEnd)} dias</p><p className="text-xs text-[var(--muted)]">{formatDate(user.subscription?.currentPeriodEnd)}</p></div>
                  </div>
                ))}
              </div>
            </div>

            <IntegrationHealth integration={integration} />
          </section>
        </div>
      ) : null}

      {activeTab === "finance" ? (
        <div className="grid gap-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard icon={WalletCards} label="MRR estimado" value={formatMoney(mrrCents)} detail={`${summary.activeSubscriptions} assinaturas`} />
            <SummaryCard icon={Banknote} label="Receita confirmada" value={formatMoney(summary.approvedRevenueCents)} detail="Histórico aprovado" />
            <SummaryCard icon={CreditCard} label="Pendentes" value={String(summary.pendingPayments)} detail="Aguardando confirmação" />
            <SummaryCard icon={CalendarClock} label="A vencer" value={String(summary.dueSoon)} detail="Próximos 7 dias" />
          </section>

          <IntegrationHealth integration={integration} />

          <section className="soft-card rounded-[8px] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-bold">Pagamentos <HelpTip content="O status é confirmado pela API e pelos webhooks assinados do Mercado Pago." /></h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Últimas transações iniciadas no Sistema Fitness.</p>
              </div>
              <Badge>{payments.length} registros</Badge>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                  <tr><th className="py-3">Aluno</th><th>Forma</th><th>Status</th><th>Valor</th><th>Referência</th><th>Data</th></tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-[var(--line)] last:border-0">
                      <td className="py-3"><p className="font-semibold">{payment.user.name}</p><p className="text-xs text-[var(--muted)]">{payment.user.email}</p></td>
                      <td className="capitalize">{payment.mode === "recurring" ? "Recorrente" : payment.mode === "pix" ? "Pix" : "Cartão"}</td>
                      <td><Badge>{paymentLabel(payment.status)}</Badge></td>
                      <td className="font-bold">{formatMoney(payment.amountCents, payment.currency)}</td>
                      <td className="max-w-40 truncate font-mono text-xs text-[var(--muted)]" title={payment.providerRef ?? ""}>{payment.providerRef ?? "Aguardando"}</td>
                      <td>{new Date(payment.paidAt ?? payment.createdAt).toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payments.length === 0 ? <p className="py-8 text-center text-sm text-[var(--muted)]">Nenhum pagamento registrado.</p> : null}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "users" ? (
        <section className="soft-card rounded-[8px] p-5">
          <div className="border-b border-[var(--line)] pb-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--primary),transparent_86%)] text-[var(--primary)]"><UserPlus size={18} /></div>
              <div><h2 className="font-bold">Cadastrar aluno manualmente</h2><p className="mt-1 text-sm text-[var(--muted)]">Cria o perfil, calcula as metas, gera os planos iniciais e envia o acesso por e-mail.</p></div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="manual-user-form">
              <Field label="Nome" name="name" value={newUser.name} onChange={(event) => setNewUser({ ...newUser, name: event.target.value })} />
              <Field label="E-mail" name="email" type="email" value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} />
              <Field label="Idade" name="age" type="number" min={12} max={90} value={newUser.age} onChange={(event) => setNewUser({ ...newUser, age: event.target.value })} />
              <SelectField label="Sexo" name="sex" value={newUser.sex} onChange={(event) => setNewUser({ ...newUser, sex: event.target.value })}>
                <option value="NOT_INFORMED">Não informado</option><option value="FEMALE">Feminino</option><option value="MALE">Masculino</option><option value="OTHER">Outro</option>
              </SelectField>
              <Field label="Altura (cm)" name="heightCm" type="number" min={120} max={230} step="0.1" value={newUser.heightCm} onChange={(event) => setNewUser({ ...newUser, heightCm: event.target.value })} />
              <Field label="Peso (kg)" name="weightKg" type="number" min={35} max={280} step="0.1" value={newUser.weightKg} onChange={(event) => setNewUser({ ...newUser, weightKg: event.target.value })} />
              <SelectField label="Objetivo" name="objective" value={newUser.objective} onChange={(event) => setNewUser({ ...newUser, objective: event.target.value })}>
                <option value="FAT_LOSS">Perder peso</option><option value="HYPERTROPHY">Ganhar músculos</option><option value="RECOMPOSITION">Recomposição corporal</option><option value="STRENGTH">Força</option><option value="CONDITIONING">Condicionamento</option><option value="ENDURANCE">Resistência</option><option value="BEGINNER">Começar a treinar</option><option value="RETURN_GRADUAL">Retorno gradual</option>
              </SelectField>
              <SelectField label="Atividade" name="activityLevel" value={newUser.activityLevel} onChange={(event) => setNewUser({ ...newUser, activityLevel: event.target.value })}>
                <option value="SEDENTARY">Sedentário</option><option value="LIGHT">Levemente ativo</option><option value="MODERATE">Moderadamente ativo</option><option value="VERY_ACTIVE">Muito ativo</option>
              </SelectField>
            </div>
            <div className="mt-4 grid gap-3">
              <label className="flex items-start gap-2 text-sm leading-5"><input className="mt-1 size-4 accent-[var(--primary)]" type="checkbox" checked={newUser.lifetime} onChange={(event) => setNewUser({ ...newUser, lifetime: event.target.checked })} /><span>Conceder <strong>assinatura vitalícia</strong> (acesso liberado, sem cobrança). Desmarcado = 2 dias de teste.</span></label>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <label className="flex items-start gap-2 text-sm leading-5"><input className="mt-1 size-4 accent-[var(--primary)]" type="checkbox" checked={newUser.consentConfirmed} onChange={(event) => setNewUser({ ...newUser, consentConfirmed: event.target.checked })} /><span>Confirmo que os dados foram fornecidos pelo aluno e que ele autorizou este cadastro.</span></label>
                <Button type="button" disabled={creatingUser || !newUser.consentConfirmed} onClick={() => void createUser()}><UserPlus size={17} /> {creatingUser ? "Cadastrando..." : "Cadastrar aluno"}</Button>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div><h2 className="font-bold">Usuários e permissões</h2><p className="mt-1 text-sm text-[var(--muted)]">Controle de acesso, função e situação da assinatura.</p></div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative">
                <span className="sr-only">Buscar usuário</span><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome ou e-mail" className="min-h-10 w-full rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)] pl-9 pr-3 text-sm outline-none focus:border-[var(--primary)] sm:w-64" />
              </label>
              <select aria-label="Filtrar usuários" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-h-10 rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)] px-3 text-sm">
                <option value="all">Todos</option><option value="active">Assinatura ativa</option><option value="trial">Em trial</option><option value="blocked">Bloqueados</option>
              </select>
              <a href="/api/admin/users/export" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-semibold transition hover:border-[var(--primary)] hover:text-[var(--primary)]">
                <Download size={16} /> CSV
              </a>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                <tr><th className="py-3">Usuário</th><th>Perfil</th><th>Acesso</th><th>Assinatura</th><th>Vencimento</th><th className="text-right">Ação</th></tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="py-3"><p className="font-semibold">{user.name}</p><p className="text-xs text-[var(--muted)]">{user.email}</p></td>
                    <td><select className="min-h-9 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-2" value={user.role} onChange={(event) => void updateUser(user.id, { role: event.target.value })}>{roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}</select></td>
                    <td>{user.isActive ? "Ativo" : "Bloqueado"}</td>
                    <td><Badge>{user.subscription?.planName === "Vitalício" ? "Vitalício" : user.subscription?.status ?? "Sem assinatura"}</Badge></td>
                    <td>{user.subscription?.planName === "Vitalício" ? "Sem vencimento" : formatDate(user.subscription?.currentPeriodEnd)}</td>
                    <td className="text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <RowAction onClick={() => void updateUser(user.id, { isActive: !user.isActive })} disabled={busyUserId === user.id}>{user.isActive ? "Bloquear" : "Ativar"}</RowAction>
                        <RowAction onClick={() => void grantLifetime(user.id)} disabled={busyUserId === user.id || user.subscription?.planName === "Vitalício"}>Vitalício</RowAction>
                        <RowAction onClick={() => void resetPassword(user.id)} disabled={busyUserId === user.id}>Nova senha</RowAction>
                        <RowAction danger onClick={() => void deleteUser(user.id, user.name)} disabled={busyUserId === user.id || user.role === "ADMIN"}>Excluir</RowAction>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab === "support" ? (
        <section className="soft-card rounded-[8px] p-5">
          <div className="flex items-center justify-between gap-4">
            <div><h2 className="font-bold">Chamados de suporte</h2><p className="mt-1 text-sm text-[var(--muted)]">Mensagens enviadas pelos alunos pelo botão de suporte.</p></div>
            <Badge>{ticketList.length}</Badge>
          </div>
          <div className="mt-4 grid gap-3">
            {ticketList.length === 0 ? <p className="py-8 text-center text-sm text-[var(--muted)]">Nenhum chamado por enquanto.</p> : null}
            {ticketList.map((ticket) => (
              <article key={ticket.id} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold">{ticket.subject}</p>
                    <p className="truncate text-xs text-[var(--muted)]">{ticket.user.name} · {ticket.user.email}</p>
                  </div>
                  <Badge className={ticket.status === "closed" ? "text-[var(--muted)]" : ticket.status === "answered" ? "text-[var(--primary)]" : "text-[var(--gold)]"}>{statusLabel(ticket.status)}</Badge>
                </div>
                <div className="mt-3 grid gap-2">
                  {ticket.messages.map((entry, index) => (
                    <div key={index} className="rounded-[8px] bg-[var(--surface)] p-3 text-sm">
                      <p className="text-xs font-semibold text-[var(--muted)]">{entry.author}{entry.createdAt ? ` · ${new Date(entry.createdAt).toLocaleString("pt-BR")}` : ""}</p>
                      <p className="mt-1 whitespace-pre-wrap">{entry.body}</p>
                    </div>
                  ))}
                </div>
                {replyFor === ticket.id ? (
                  <div className="mt-3 grid gap-2">
                    <textarea value={replyText} onChange={(event) => setReplyText(event.target.value)} placeholder="Escreva a resposta para o aluno..." className="min-h-20 w-full rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3 text-sm outline-none focus:border-[var(--primary)]" />
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" onClick={() => void sendTicketUpdate(ticket.id, { message: replyText })} disabled={replyText.trim().length < 2}><Send size={15} /> Enviar resposta</Button>
                      <Button type="button" variant="secondary" onClick={() => { setReplyFor(null); setReplyText(""); }}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => { setReplyFor(ticket.id); setReplyText(""); }}>Responder</Button>
                    {ticket.status !== "closed"
                      ? <RowAction onClick={() => void sendTicketUpdate(ticket.id, { status: "closed" })}>Marcar resolvido</RowAction>
                      : <RowAction onClick={() => void sendTicketUpdate(ticket.id, { status: "open" })}>Reabrir</RowAction>}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function statusLabel(status: string) {
  return status === "closed" ? "Resolvido" : status === "answered" ? "Respondido" : "Aberto";
}

function RowAction({ danger, className, ...props }: ComponentProps<"button"> & { danger?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-[6px] border px-2.5 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${danger ? "border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white" : "border-[var(--line)] text-[var(--foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)]"} ${className ?? ""}`}
    />
  );
}

function SummaryCard({ icon: Icon, label, value, detail }: { icon: typeof Users; label: string; value: string; detail: string }) {
  return <div className="soft-card rounded-[8px] p-4"><div className="flex items-center gap-2 text-sm font-semibold text-[var(--muted)]"><Icon size={17} /> {label}</div><p className="mt-3 text-2xl font-black">{value}</p><p className="mt-1 text-xs text-[var(--muted)]">{detail}</p></div>;
}

function IntegrationHealth({ integration }: { integration: IntegrationStatus }) {
  const checks = [
    ["Checkout", integration.checkout, "Credenciais privadas carregadas"],
    ["Webhook assinado", integration.webhook, "Segredo de assinatura configurado"],
    ["URL pública", integration.publicUrl, "HTTPS disponível para notificações"],
  ] as const;
  return (
    <section className="soft-card rounded-[8px] p-5">
      <div className="flex items-center justify-between gap-4"><div><h2 className="font-bold">Saúde do Mercado Pago</h2><p className="mt-1 text-sm text-[var(--muted)]">Prontidão para receber e conciliar cobranças.</p></div><CreditCard size={21} className="text-[var(--primary)]" /></div>
      <div className="mt-4 grid gap-2">
        {checks.map(([label, ready, detail]) => <div key={label} className="flex items-center justify-between gap-4 rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)] p-3 text-sm"><div><p className="font-semibold">{label}</p><p className="text-xs text-[var(--muted)]">{detail}</p></div><Badge className={ready ? "text-[var(--primary)]" : "text-[var(--danger)]"}>{ready ? "Pronto" : "Pendente"}</Badge></div>)}
      </div>
      <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-[var(--muted)]"><span>{integration.webhookErrors} erro(s) recente(s)</span><span>Último evento: {integration.lastWebhookAt ? new Date(integration.lastWebhookAt).toLocaleString("pt-BR") : "ainda não recebido"}</span></div>
    </section>
  );
}
