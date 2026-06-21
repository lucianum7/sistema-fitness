import { RequestResetForm } from "@/components/auth-forms";
import { Logo } from "@/components/logo";

export default function RecuperarSenhaPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="fit-card w-full max-w-md rounded-[8px] p-6">
        <Logo href="/" />
        <h1 className="mt-6 text-3xl font-black">Recuperar senha</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Enviaremos um link de redefinição se o e-mail estiver cadastrado.</p>
        <div className="mt-6">
          <RequestResetForm />
        </div>
      </section>
    </main>
  );
}
