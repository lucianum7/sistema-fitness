import { LoginForm } from "@/components/auth-forms";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";

export default function EntrarPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="fit-card w-full max-w-md rounded-[8px] p-6">
        <div className="mb-6 flex items-center justify-between">
          <Logo href="/" />
          <ThemeToggle />
        </div>
        <h1 className="text-3xl font-black">Entrar</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Acesse sua rotina de treino, alimentação e evolução.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Ainda não tem conta?{" "}
          <Link className="font-semibold text-[var(--primary)]" href="/cadastro">
            Criar conta
          </Link>
        </p>
      </section>
    </main>
  );
}
