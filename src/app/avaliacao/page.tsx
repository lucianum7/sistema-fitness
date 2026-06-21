import { redirect } from "next/navigation";
import { AvaliacaoForm } from "@/components/avaliacao-form";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireUser } from "@/lib/server/auth";

export default async function AvaliacaoPage() {
  const user = await requireUser();
  // Admin não tem avaliação; aluno que já preencheu vai para o painel.
  if (user.role === "ADMIN") redirect("/admin");
  if (user.profile) redirect("/painel");

  const firstName = user.name.split(" ")[0] || user.name;

  return (
    <main className="min-h-screen px-4 py-6 md:py-10">
      <section className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Logo href="/painel" />
          <ThemeToggle />
        </div>
        <div className="fit-card rounded-[8px] p-5 md:p-8">
          <p className="text-sm font-semibold text-[var(--primary)]">Bem-vindo, {firstName}</p>
          <h1 className="mt-1 text-3xl font-black md:text-4xl">Vamos montar seu plano</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Preencha sua avaliação para calcular metas e gerar treino e dieta. Leva poucos minutos — e você pode ajustar tudo depois.
          </p>
          <div className="mt-8">
            <AvaliacaoForm />
          </div>
        </div>
      </section>
    </main>
  );
}
