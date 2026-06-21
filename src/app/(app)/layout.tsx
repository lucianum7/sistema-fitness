import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/server/auth";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  // Aluno que ainda não preencheu a avaliação é levado para concluí-la.
  if (user.role !== "ADMIN" && !user.profile) redirect("/avaliacao");

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: Boolean(user.emailVerifiedAt),
        subscription: user.subscription
          ? {
              status: user.subscription.status,
              currentPeriodEnd: user.subscription.currentPeriodEnd.toISOString(),
            }
          : null,
      }}
    >
      {children}
    </AppShell>
  );
}
