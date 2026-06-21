import Link from "next/link";
import { RegisterForm } from "@/components/auth-forms";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function CadastroPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="fit-card w-full max-w-md rounded-[8px] p-6 md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <Logo href="/" />
          <ThemeToggle />
        </div>
        <h1 className="text-3xl font-black">Criar conta</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Comece em segundos. Depois de entrar, você faz a avaliação para gerar treino e dieta.
        </p>
        <div className="mt-6">
          <RegisterForm />
        </div>
        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Já tem conta?{" "}
          <Link className="font-semibold text-[var(--primary)]" href="/entrar">
            Entrar
          </Link>
        </p>
      </section>
    </main>
  );
}
