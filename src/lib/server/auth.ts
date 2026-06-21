import { redirect } from "next/navigation";
import { getPrisma } from "./db";
import { getSession } from "./session";

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const prisma = getPrisma();
  const user = await prisma.user.findFirst({
    where: { id: session.userId, isActive: true, deletedAt: null },
    include: { profile: true, subscription: true },
  });

  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  return user;
}

export function hasActiveAccess(user: { role: string; subscription?: { status: string; currentPeriodEnd: Date } | null } | null) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;

  const subscription = user.subscription;
  if (!subscription) return false;

  const periodIsActive = subscription.currentPeriodEnd.getTime() >= Date.now();
  return subscription.status === "ACTIVE" ? periodIsActive : subscription.status === "TRIAL" && periodIsActive;
}

export async function requireActiveAccess() {
  const user = await requireUser();
  if (!hasActiveAccess(user)) redirect("/configuracoes");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/painel");
  return user;
}
