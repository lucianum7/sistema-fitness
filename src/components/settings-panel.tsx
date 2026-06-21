"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Calculator,
  CheckCircle2,
  CreditCard,
  Mail,
  RefreshCw,
  Save,
  Scale,
  ShieldCheck,
  Target,
} from "lucide-react";
import { Button, Card, Field, HelpTip, LinkButton, SelectField } from "./ui";

type MetabolicProfile = {
  age: number;
  sex: string;
  heightCm: number;
  weightKg: number;
  bodyFatPct?: number | null;
  objective: string;
  activityLevel: string;
};

type Metrics = {
  bmi: number;
  bmiCategory: string;
  bmr: number;
  tdee: number;
  activityLabel: string;
  activityFactor: number;
  goalAdjustmentPct: number;
  estimatedWeeklyWeightChangeKg: number;
  formulas: {
    bmr: string;
    tdee: string;
    calories: string;
    macros: string;
    water: string;
  };
  targets: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
    waterMl: number;
  };
};

const objectives = [
  ["FAT_LOSS", "Perder peso"],
  ["HYPERTROPHY", "Ganhar massa muscular"],
  ["RECOMPOSITION", "Recomposição corporal"],
  ["STRENGTH", "Aumentar força"],
  ["CONDITIONING", "Melhorar condicionamento"],
  ["ENDURANCE", "Ganhar resistência"],
  ["BEGINNER", "Começar a treinar"],
  ["RETURN_GRADUAL", "Retorno gradual"],
] as const;

export function SettingsPanel({
  userName,
  userEmail,
  role,
  profile,
  metrics: initialMetrics,
  subscription,
}: {
  userName: string;
  userEmail: string;
  role: string;
  profile?: MetabolicProfile | null;
  metrics?: Metrics | null;
  subscription?: { status: string; currentPeriodEnd: string; providerRef?: string | null } | null;
}) {
  const router = useRouter();
  const syncStarted = useRef(false);
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [emailingData, setEmailingData] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState<"recurring" | "pix" | "card" | "sync" | null>(null);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [form, setForm] = useState(() => ({
    age: String(profile?.age ?? ""),
    sex: profile?.sex ?? "NOT_INFORMED",
    heightCm: String(profile?.heightCm ?? ""),
    weightKg: String(profile?.weightKg ?? ""),
    bodyFatPct: profile?.bodyFatPct == null ? "" : String(profile.bodyFatPct),
    objective: profile?.objective ?? "RECOMPOSITION",
    activityLevel: profile?.activityLevel ?? "MODERATE",
  }));

  useEffect(() => {
    if (syncStarted.current || role === "ADMIN") return;
    const params = new URLSearchParams(window.location.search);
    const paymentReturn = params.get("payment");
    if (!paymentReturn) return;
    syncStarted.current = true;

    queueMicrotask(() => {
      if (paymentReturn === "failure") {
        setMessage("O pagamento não foi concluído. Nenhuma cobrança foi confirmada.");
        window.history.replaceState({}, "", "/configuracoes");
        return;
      }

      const paymentId = params.get("payment_id") ?? params.get("collection_id") ?? undefined;
      setPaymentLoading("sync");
      void fetch("/api/payments/mercado-pago/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paymentId }),
      })
        .then((response) => response.json())
        .then((result) => {
          if (!result.ok) throw new Error(result.error);
          setMessage(result.data.pending
            ? "Pagamento recebido e aguardando confirmação do Mercado Pago."
            : "Pagamento confirmado. Seu acesso foi atualizado.");
          router.refresh();
        })
        .catch((error: unknown) => {
          setMessage(error instanceof Error ? error.message : "Não foi possível consultar o pagamento.");
        })
        .finally(() => {
          setPaymentLoading(null);
          window.history.replaceState({}, "", "/configuracoes");
        });
    });
  }, [role, router]);

  async function saveProfile() {
    setSavingProfile(true);
    setMessage("");
    const result = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    }).then((response) => response.json());
    setSavingProfile(false);
    if (!result.ok) {
      setMessage(result.error ?? "Não foi possível atualizar o perfil.");
      return;
    }
    setMetrics(result.data.metrics);
    setMessage("Perfil atualizado e metas recalculadas.");
    router.refresh();
  }

  async function deleteAccount() {
    const result = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirm }),
    }).then((response) => response.json());
    if (result.ok) router.push("/");
    else setMessage(result.error);
  }

  async function startMercadoPagoCheckout(mode: "recurring" | "pix" | "card") {
    setPaymentLoading(mode);
    setMessage("");
    const result = await fetch("/api/payments/mercado-pago/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode }),
    }).then((response) => response.json());
    setPaymentLoading(null);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    window.location.assign(result.data.checkoutUrl);
  }

  return (
    <div className="grid gap-5">
      {message ? (
        <div className="flex items-center gap-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold" role="status">
          <CheckCircle2 size={17} className="text-[var(--primary)]" /> {message}
        </div>
      ) : null}

      {role !== "ADMIN" && profile ? (
        <Card className="overflow-hidden p-0 md:p-0">
          <div className="border-b border-[var(--line)] px-5 py-5 md:px-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[var(--primary)]">Base dos seus planos</p>
                <h2 className="mt-1 flex items-center gap-2 text-xl font-black"><Target size={21} /> Perfil e objetivo</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                  Estes dados orientam os cálculos metabólicos e as próximas gerações de treino e alimentação.
                </p>
              </div>
              <LinkButton href="/evolucao" variant="secondary"><Activity size={17} /> Registrar medidas</LinkButton>
            </div>
          </div>

          <div className="grid gap-6 p-5 md:p-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="grid content-start gap-4 sm:grid-cols-2">
              <Field label="Idade" type="number" min={12} max={90} value={form.age} onChange={(event) => setForm({ ...form, age: event.target.value })} />
              <SelectField label="Sexo" value={form.sex} onChange={(event) => setForm({ ...form, sex: event.target.value })}>
                <option value="FEMALE">Feminino</option>
                <option value="MALE">Masculino</option>
                <option value="OTHER">Outro</option>
                <option value="NOT_INFORMED">Prefiro não informar</option>
              </SelectField>
              <Field label="Altura (cm)" type="number" min={120} max={230} step="0.1" value={form.heightCm} onChange={(event) => setForm({ ...form, heightCm: event.target.value })} />
              <Field label="Peso atual (kg)" type="number" min={35} max={280} step="0.1" value={form.weightKg} onChange={(event) => setForm({ ...form, weightKg: event.target.value })} />
              <Field label="Gordura corporal (%)" hint="Opcional. Use uma avaliação consistente ao comparar períodos." type="number" min={1} max={75} step="0.1" value={form.bodyFatPct} onChange={(event) => setForm({ ...form, bodyFatPct: event.target.value })} />
              <SelectField label="Objetivo principal" value={form.objective} onChange={(event) => setForm({ ...form, objective: event.target.value })}>
                {objectives.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </SelectField>
              <SelectField label="Nível de atividade" hint="Inclua treinos e atividade da rotina. O fator escolhido multiplica a taxa metabólica basal." value={form.activityLevel} onChange={(event) => setForm({ ...form, activityLevel: event.target.value })}>
                <option value="SEDENTARY">Sedentário - pouco exercício</option>
                <option value="LIGHT">Levemente ativo - 1 a 3 treinos/semana</option>
                <option value="MODERATE">Moderadamente ativo - 3 a 5 treinos/semana</option>
                <option value="VERY_ACTIVE">Muito ativo - 6 a 7 treinos ou trabalho físico</option>
              </SelectField>
              <Button className="sm:col-span-2 sm:justify-self-start" type="button" onClick={() => void saveProfile()} disabled={savingProfile}>
                <Save size={17} /> {savingProfile ? "Recalculando..." : "Salvar e recalcular"}
              </Button>
            </div>

            <div className="grid content-start gap-3 sm:grid-cols-2">
              {metrics ? (
                <>
                  <Metric icon={Scale} label="IMC" value={String(metrics.bmi)} detail={metrics.bmiCategory} />
                  <Metric icon={Calculator} label="Metabolismo basal" value={`${metrics.bmr} kcal`} detail="Estimativa em repouso" />
                  <Metric icon={RefreshCw} label="Gasto diário" value={`${metrics.tdee} kcal`} detail={`${metrics.activityLabel} × ${metrics.activityFactor}`} />
                  <Metric icon={Target} label="Meta calórica" value={`${metrics.targets.calories} kcal`} detail={`${metrics.goalAdjustmentPct > 0 ? "+" : ""}${metrics.goalAdjustmentPct}% • ${metrics.targets.proteinG} g proteína`} />
                  <div className="sm:col-span-2 grid grid-cols-3 gap-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)] p-4 text-center">
                    <SmallMetric label="Carboidratos" value={`${metrics.targets.carbsG} g`} />
                    <SmallMetric label="Gorduras" value={`${metrics.targets.fatG} g`} />
                    <SmallMetric label="Água" value={`${(metrics.targets.waterMl / 1000).toFixed(1)} L`} />
                  </div>
                  <p className="sm:col-span-2 text-xs leading-5 text-[var(--muted)]">
                    Projeção matemática, não promessa de resultado: {metrics.estimatedWeeklyWeightChangeKg > 0 ? "+" : ""}{metrics.estimatedWeeklyWeightChangeKg} kg/semana. Reavalie com peso e adesão reais após 2 a 3 semanas.
                  </p>
                  <details className="sm:col-span-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)] p-4 text-sm">
                    <summary className="cursor-pointer font-bold">Como estas metas foram calculadas</summary>
                    <div className="mt-3 grid gap-2 text-xs leading-5 text-[var(--muted)]">
                      <p>{metrics.formulas.bmr}</p>
                      <p>{metrics.formulas.tdee}</p>
                      <p>{metrics.formulas.calories}</p>
                      <p>{metrics.formulas.macros}</p>
                      <p>{metrics.formulas.water}</p>
                      <p>Referências de método: equação de Mifflin-St Jeor para TMB; fatores de atividade para estimar o gasto; proteína entre 1,6 e 2,2 g/kg e fibras de 14 g/1.000 kcal.</p>
                    </div>
                  </details>
                </>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="flex items-center gap-2 font-bold"><ShieldCheck size={18} /> Conta e segurança</h2>
          <div className="mt-4 grid gap-3 rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)] p-4 text-sm">
            <p><strong>Nome:</strong> {userName}</p>
            <p className="break-all"><strong>E-mail:</strong> {userEmail}</p>
            <p><strong>Perfil:</strong> {role === "ADMIN" ? "Administrador" : "Aluno"}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={emailingData}
              onClick={async () => {
                setEmailingData(true);
                setMessage("");
                const result = await fetch("/api/exports/email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "dados" }) }).then((response) => response.json());
                setEmailingData(false);
                setMessage(result.ok ? `Enviamos seus dados para o seu e-mail (${result.data.to}).` : result.error ?? "Não foi possível enviar.");
              }}
            >
              {emailingData ? <RefreshCw className="animate-spin" size={17} /> : <Mail size={17} />} Receber meus dados por e-mail
            </Button>
          </div>
        </Card>

        {role !== "ADMIN" ? (
          <Card>
            <h2 className="flex items-center gap-2 font-bold">
              <CreditCard size={18} /> Plano e pagamento
              <HelpTip content="O trial dura 2 dias. A cobrança e a confirmação acontecem no ambiente seguro do Mercado Pago." />
            </h2>
            <div className="mt-4 flex items-end justify-between gap-4 rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
              <div>
                <p className="text-sm text-[var(--muted)]">Sistema Fitness Performance</p>
                <p className="mt-1 text-2xl font-black">R$ 27,77 <span className="text-sm font-medium text-[var(--muted)]">/ mês</span></p>
              </div>
              <span className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-bold">{subscription?.status ?? "TRIAL"}</span>
            </div>
            {subscription?.currentPeriodEnd ? <p className="mt-2 text-xs text-[var(--muted)]">Acesso atual até {new Date(subscription.currentPeriodEnd).toLocaleDateString("pt-BR")}</p> : null}
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <Button type="button" onClick={() => void startMercadoPagoCheckout("recurring")} disabled={paymentLoading !== null}>Recorrente</Button>
              <Button type="button" variant="secondary" onClick={() => void startMercadoPagoCheckout("pix")} disabled={paymentLoading !== null}>Pix</Button>
              <Button type="button" variant="secondary" onClick={() => void startMercadoPagoCheckout("card")} disabled={paymentLoading !== null}>Cartão</Button>
            </div>
            {paymentLoading === "sync" ? <p className="mt-3 text-sm text-[var(--muted)]">Consultando confirmação do pagamento...</p> : null}
          </Card>
        ) : null}

        <Card className={role === "ADMIN" ? "lg:col-span-1" : "lg:col-span-2"}>
          <h2 className="font-bold">Privacidade e LGPD</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Você pode exportar seus dados ou encerrar a conta. A exclusão remove o acesso e preserva somente a trilha legal mínima de auditoria.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <Field label="Digite EXCLUIR para encerrar a conta" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
            <Button type="button" variant="danger" disabled={confirm !== "EXCLUIR"} onClick={() => void deleteAccount()}>Excluir conta</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Calculator; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]"><Icon size={15} /> {label}</div>
      <p className="mt-2 text-xl font-black">{value}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">{detail}</p>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><p className="truncate text-[11px] text-[var(--muted)]">{label}</p><p className="mt-1 text-sm font-black">{value}</p></div>;
}
