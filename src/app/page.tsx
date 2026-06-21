import { Activity, ArrowRight, BarChart3, CalendarDays, CheckCircle2, Droplets, Dumbbell, Flame, HeartPulse, ShieldCheck, Sparkles, Utensils } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LinkButton } from "@/components/ui";

const pillars = [
  { icon: Dumbbell, title: "Treinos claros", text: "Divisão semanal, progressão, deload, substituições e modo treino para registrar carga e repetições." },
  { icon: Utensils, title: "Dieta ajustável", text: "Cardápios com porções, trocas equivalentes, totais por refeição e lista de compras automática." },
  { icon: BarChart3, title: "Evolução consistente", text: "Peso, medidas, gordura corporal, cargas, volume semanal e aderência em gráficos fáceis de acompanhar." },
  { icon: Droplets, title: "Rotina completa", text: "Hidratação, sono, hábitos, lembretes, conquistas e relatórios para manter a rotina sob controle." },
];

const safeguards = [
  "Triagem antes de gerar planos",
  "Consentimentos e exportação de dados",
  "Revisão profissional quando houver risco",
  "Conta com recuperação de senha e proteção contra abuso",
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 md:px-6">
        <Logo href="#inicio" />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação pública">
          <a className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]" href="#recursos">
            Recursos
          </a>
          <a className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]" href="#seguranca">
            Segurança
          </a>
          <a className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]" href="#rotina">
            Rotina
          </a>
          <LinkButton href="/entrar" variant="secondary" className="ml-2">
            Entrar
          </LinkButton>
          <ThemeToggle />
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <LinkButton href="/entrar" variant="secondary" className="px-4">
            Entrar
          </LinkButton>
        </div>
      </header>

      <section id="inicio" className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 pb-16 pt-6 md:grid-cols-2 md:gap-8 md:px-6 lg:pt-10">
        <div className="motion-rise max-w-xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-bold text-[var(--primary)] shadow-sm">
            <Flame size={16} /> Treino, dieta e evolução em um só app
          </p>
          <h1 className="mt-5 text-5xl font-black leading-[1.04] tracking-tight md:text-6xl">
            Sua melhor versão começa <span className="text-[var(--primary)]">hoje</span>.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-[var(--muted)]">
            O Sistema Fitness monta seu treino e sua dieta sob medida, acompanha sua evolução e mantém sua rotina no controle — bonito, rápido e fácil de usar todos os dias.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/cadastro" className="text-base">
              Criar conta grátis <ArrowRight size={18} />
            </LinkButton>
            <LinkButton href="/entrar" variant="secondary" className="text-base">
              Já tenho conta
            </LinkButton>
          </div>
          <div className="mt-8 grid gap-3 text-sm text-[var(--muted)] sm:grid-cols-3">
            {["2 dias grátis", "Sem cartão para começar", "Cancele quando quiser"].map((item) => (
              <span key={item} className="inline-flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[var(--primary)]" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="motion-rise relative mx-auto w-full max-w-md">
          <div className="overflow-hidden rounded-[22px] border border-[var(--line)] shadow-[var(--shadow)]">
            <img
              src="/hero-fitness.jpg"
              alt="Mulher atleta treinando com halter em uma academia moderna"
              width={1024}
              height={1536}
              className="aspect-[2/3] w-full object-cover"
            />
          </div>
          <div className="absolute -left-3 top-10 hidden rounded-[14px] border border-[var(--line)] bg-[var(--surface)]/95 px-4 py-3 shadow-lg backdrop-blur sm:block">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-full bg-[var(--primary)] text-white"><Activity size={17} /></span>
              <div>
                <p className="text-xs text-[var(--muted)]">Treino de hoje</p>
                <p className="text-sm font-black">Superior A · 6 exercícios</p>
              </div>
            </div>
          </div>
          <div className="absolute -right-3 bottom-12 hidden rounded-[14px] border border-[var(--line)] bg-[var(--surface)]/95 px-4 py-3 shadow-lg backdrop-blur sm:block">
            <p className="text-xs text-[var(--muted)]">Meta calórica</p>
            <p className="text-lg font-black text-[var(--primary)]">2.180 kcal</p>
            <div className="mt-1.5 h-1.5 w-28 rounded-full bg-[var(--line)]"><span className="block h-1.5 w-[72%] rounded-full bg-[var(--primary)]" /></div>
          </div>
        </div>
      </section>

      <section id="recursos" className="border-y border-[var(--line)] bg-[var(--surface)]/82 py-16 backdrop-blur">
        <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase text-[var(--primary)]">Estrutura completa</p>
            <h2 className="mt-3 text-3xl font-black md:text-5xl">Tudo que o aluno precisa, sem tela confusa.</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {pillars.map((feature) => (
              <article key={feature.title} className="quiet-card rounded-[8px] p-5 transition hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]">
                <feature.icon className="mb-5 text-[var(--primary)]" />
                <h3 className="text-lg font-black">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="rotina" className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-16 md:grid-cols-[0.78fr_1.22fr] md:px-6">
        <div>
          <p className="text-sm font-bold uppercase text-[var(--primary)]">Acompanhamento</p>
          <h2 className="mt-3 text-3xl font-black md:text-5xl">Progresso com contexto, não promessa vazia.</h2>
          <p className="mt-5 text-base leading-8 text-[var(--muted)]">
            O Sistema Fitness mostra tendências de medidas, peso, treinos e adesão para ajudar o aluno a ajustar a rotina com responsabilidade.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { icon: CalendarDays, title: "Consistência", text: "Calendário de presença, sequência de dias e metas semanais." },
            { icon: HeartPulse, title: "Recuperação", text: "Sono, hidratação e alertas de baixa adesão antes de avançar carga." },
            { icon: Sparkles, title: "Conquistas", text: "Marcos simples para reforçar evolução sem pressão desnecessária." },
            { icon: ShieldCheck, title: "Segurança", text: "Orientação clara quando houver dor, lesão, doença, medicamento ou limitação." },
          ].map((item) => (
            <article key={item.title} className="soft-card rounded-[8px] p-5">
              <item.icon className="text-[var(--primary)]" />
              <h3 className="mt-4 font-black">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="seguranca" className="border-t border-[var(--line)] bg-[var(--foreground)] py-16 text-[var(--background)]">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 md:grid-cols-[0.9fr_1.1fr] md:px-6">
          <div>
            <ShieldCheck className="mb-5 text-[var(--gold)]" />
            <h2 className="text-3xl font-black md:text-5xl">Segurança desde a avaliação inicial.</h2>
            <p className="mt-5 text-base leading-8 opacity-75">
              A avaliação calcula metas, identifica sinais de atenção e registra consentimentos antes de liberar planos personalizados.
            </p>
          </div>
          <div className="grid gap-3">
            {safeguards.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-[8px] border border-white/[0.12] bg-white/[0.07] p-4">
                <CheckCircle2 size={18} className="text-[var(--gold)]" />
                <span className="font-semibold">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 md:px-6">
        <div className="soft-card flex flex-col items-center gap-6 rounded-[16px] p-8 text-center md:p-12">
          <h2 className="max-w-2xl text-3xl font-black md:text-4xl">Comece hoje com 2 dias grátis e veja seu plano em minutos.</h2>
          <LinkButton href="/cadastro" className="text-base">
            Criar minha conta <ArrowRight size={18} />
          </LinkButton>
        </div>
      </section>
    </main>
  );
}
