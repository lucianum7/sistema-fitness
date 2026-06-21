import { VerifyEmailClient } from "@/components/auth-forms";
import { Logo } from "@/components/logo";

export default async function VerificarEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="fit-card w-full max-w-md rounded-[8px] p-6">
        <Logo href="/" />
        <h1 className="mt-6 text-3xl font-black">Confirmar e-mail</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Confirme seu endereço para manter sua conta protegida.</p>
        <div className="mt-6">
          <VerifyEmailClient token={token} />
        </div>
      </section>
    </main>
  );
}
