import "dotenv/config";
import { getPrisma } from "../src/lib/server/db";
import { hashPassword } from "../src/lib/server/password";

async function main() {
  if (process.env.NODE_ENV !== "production") throw new Error("Este comando só pode ser executado em produção.");

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const initialPassword = process.env.ADMIN_INITIAL_PASSWORD;
  if (!email || !initialPassword || initialPassword.length < 8) {
    throw new Error("ADMIN_EMAIL e ADMIN_INITIAL_PASSWORD com pelo menos 8 caracteres são obrigatórios.");
  }

  const prisma = getPrisma();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  const admin = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { role: "ADMIN", isActive: true, deletedAt: null, emailVerifiedAt: new Date() },
      })
    : await prisma.user.create({
        data: {
          name: "Administrador Sistema Fitness",
          email,
          passwordHash: await hashPassword(initialPassword),
          role: "ADMIN",
          isActive: true,
          emailVerifiedAt: new Date(),
        },
      });

  const removedDemoUsers = await prisma.user.deleteMany({
    where: {
      email: { in: ["admin@sistema-fitness.local", "aluno@sistema-fitness.local"] },
      id: { not: admin.id },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "production.prepared",
      entity: "system",
      metadata: { removedDemoUsers: removedDemoUsers.count },
    },
  });

  console.log(`Produção preparada; ${removedDemoUsers.count} conta(s) de demonstração removida(s).`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await getPrisma().$disconnect();
  process.exit(1);
});
