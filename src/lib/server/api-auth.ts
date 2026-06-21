import { ApiError } from "./api";
import { hasActiveAccess } from "./auth";
import { getPrisma } from "./db";
import { getSession } from "./session";

export async function requireApiUser() {
  const session = await getSession();
  if (!session) throw new ApiError("Autenticação necessária.", 401);

  const user = await getPrisma().user.findFirst({
    where: { id: session.userId, isActive: true, deletedAt: null },
    include: { profile: true, subscription: true },
  });

  if (!user) throw new ApiError("Autenticação necessária.", 401);
  return user;
}

export async function requireApiActiveUser() {
  const user = await requireApiUser();
  if (!hasActiveAccess(user)) throw new ApiError("Acesso expirado. Regularize o pagamento para continuar.", 402);
  return user;
}

export async function requireApiAdmin() {
  const user = await requireApiUser();
  if (user.role !== "ADMIN") throw new ApiError("Permissão insuficiente.", 403);
  return user;
}
