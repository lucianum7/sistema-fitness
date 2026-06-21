import { ResetPasswordForm } from "@/components/auth-forms";
import { Logo } from "@/components/logo";

export default async function RedefinirSenhaPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="fit-card w-full max-w-md rounded-[8px] p-6">
        <Logo href="/" />
        <h1 className="mt-6 text-3xl font-black">Nova senha</h1>
        <div className="mt-6">
          <ResetPasswordForm token={token} />
        </div>
      </section>
    </main>
  );
}
