import { NextRequest } from "next/server";
import { addDays } from "date-fns";
import { z } from "zod";
import { calculateTargets } from "@/lib/fitness/calculations";
import type { ProfileInput } from "@/lib/fitness/types";
import { auditLog } from "@/lib/server/audit";
import { ApiError, jsonOk, handleRouteError } from "@/lib/server/api";
import { requireApiAdmin } from "@/lib/server/api-auth";
import { getPrisma } from "@/lib/server/db";
import { adminWelcomeEmail, newPasswordEmail } from "@/lib/server/email-templates";
import { sendTransactionalEmail } from "@/lib/server/mail";
import { generateTemporaryPassword, hashPassword } from "@/lib/server/password";
import { generatePlansForUser } from "@/lib/server/plans";

// Assinatura vitalícia (sem cobrança): ativa até uma data muito distante.
const LIFETIME_END = new Date("2099-12-31T00:00:00.000Z");

type UserWithSubscription = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  subscription: { planName: string; status: string; currentPeriodEnd: Date; providerRef: string | null } | null;
};

function serializeUser(user: UserWithSubscription) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    subscription: user.subscription
      ? {
          planName: user.subscription.planName,
          status: user.subscription.status,
          currentPeriodEnd: user.subscription.currentPeriodEnd.toISOString(),
          providerRef: user.subscription.providerRef,
        }
      : null,
  };
}

const updateUserSchema = z.object({
  userId: z.string().min(1),
  isActive: z.boolean().optional(),
  role: z.enum(["STUDENT", "ADMIN", "COACH", "NUTRITIONIST", "SUPPORT"]).optional(),
  grantLifetime: z.boolean().optional(),
  resetPassword: z.boolean().optional(),
});

const deleteUserSchema = z.object({ userId: z.string().min(1) });

const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  age: z.coerce.number().int().min(12).max(90),
  sex: z.enum(["FEMALE", "MALE", "OTHER", "NOT_INFORMED"]),
  heightCm: z.coerce.number().min(120).max(230),
  weightKg: z.coerce.number().min(35).max(280),
  objective: z.enum(["FAT_LOSS", "HYPERTROPHY", "RECOMPOSITION", "STRENGTH", "CONDITIONING", "ENDURANCE", "BEGINNER", "RETURN_GRADUAL"]),
  activityLevel: z.enum(["SEDENTARY", "LIGHT", "MODERATE", "VERY_ACTIVE"]),
  lifetime: z.boolean().default(false),
  consentConfirmed: z.literal(true),
});

export async function POST(request: NextRequest) {
  try {
    const admin = await requireApiAdmin();
    const input = createUserSchema.parse(await request.json());
    const prisma = getPrisma();
    const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (existing) throw new ApiError("Este e-mail já está cadastrado.", 409);

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    const trainingDays: ProfileInput["trainingDays"] = ["Segunda", "Quarta", "Sexta"];
    const profile: ProfileInput = {
      age: input.age,
      sex: input.sex,
      heightCm: input.heightCm,
      weightKg: input.weightKg,
      objective: input.objective,
      experience: "BEGINNER" as const,
      availableDays: trainingDays.length,
      trainingDays,
      trainingMethodology: "AUTO",
      sessionMinutes: 60,
      equipment: ["academia completa"],
      activityLevel: input.activityLevel,
      sleepHours: 7,
      waterLiters: 2,
      foodPreferences: [],
      allergies: [],
      intolerances: [],
      restrictions: [],
      conditions: [],
      injuries: [],
      medications: [],
      limitations: [],
    };
    const metrics = calculateTargets(profile);

    const subscription = input.lifetime
      ? { planName: "Vitalício", status: "ACTIVE" as const, currentPeriodEnd: LIFETIME_END, providerRef: "manual_lifetime" }
      : { planName: "Sistema Fitness Essencial", status: "TRIAL" as const, currentPeriodEnd: addDays(new Date(), 2) };

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: "STUDENT",
        emailVerifiedAt: new Date(),
        profile: {
          create: {
            ...profile,
            formulaSnapshot: metrics.formulas,
            targets: metrics.targets,
          },
        },
        subscription: { create: subscription },
        measurements: {
          create: {
            weightKg: input.weightKg,
            notes: "Cadastro manual pelo administrador.",
          },
        },
      },
      include: { subscription: true },
    });

    await generatePlansForUser(user.id);

    let emailSent = false;
    try {
      const mail = adminWelcomeEmail(user.name, user.email, temporaryPassword);
      const result = await sendTransactionalEmail({ userId: user.id, to: user.email, ...mail });
      emailSent = result.delivered;
    } catch (error) {
      console.error("Admin user welcome email failed", { userId: user.id, error: error instanceof Error ? error.message : "unknown" });
    }

    await auditLog({
      userId: admin.id,
      action: "admin.user_created",
      entity: "user",
      entityId: user.id,
      metadata: { lifetime: input.lifetime, emailSent },
    });

    return jsonOk({
      user: serializeUser(user),
      emailSent,
      temporaryPassword: emailSent ? null : temporaryPassword,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function GET() {
  try {
    await requireApiAdmin();
    const users = await getPrisma().user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { profile: true, subscription: true },
    });
    return jsonOk({ users });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireApiAdmin();
    const input = updateUserSchema.parse(await request.json());
    const prisma = getPrisma();
    const target = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!target || target.deletedAt) throw new ApiError("Usuário não encontrado.", 404);

    const data: Record<string, unknown> = {};
    if (typeof input.isActive === "boolean") data.isActive = input.isActive;
    if (input.role) data.role = input.role;

    let temporaryPassword: string | null = null;
    if (input.resetPassword) {
      temporaryPassword = generateTemporaryPassword();
      data.passwordHash = await hashPassword(temporaryPassword);
    }

    if (Object.keys(data).length > 0) {
      await prisma.user.update({ where: { id: input.userId }, data });
    }

    if (input.grantLifetime) {
      await prisma.subscription.upsert({
        where: { userId: input.userId },
        update: { planName: "Vitalício", status: "ACTIVE", currentPeriodEnd: LIFETIME_END, providerRef: "manual_lifetime" },
        create: { userId: input.userId, planName: "Vitalício", status: "ACTIVE", currentPeriodEnd: LIFETIME_END, providerRef: "manual_lifetime" },
      });
    }

    let emailSent = false;
    if (input.resetPassword && temporaryPassword) {
      try {
        const mail = newPasswordEmail(target.name, temporaryPassword);
        const result = await sendTransactionalEmail({ userId: target.id, to: target.email, ...mail });
        emailSent = result.delivered;
      } catch (error) {
        console.error("Admin password reset email failed", { userId: target.id, error: error instanceof Error ? error.message : "unknown" });
      }
    }

    const fresh = await prisma.user.findUniqueOrThrow({ where: { id: input.userId }, include: { subscription: true } });
    await auditLog({
      userId: admin.id,
      action: "admin.user_updated",
      entity: "user",
      entityId: input.userId,
      metadata: { grantLifetime: Boolean(input.grantLifetime), resetPassword: Boolean(input.resetPassword), emailSent },
    });

    return jsonOk({
      user: serializeUser(fresh),
      temporaryPassword: temporaryPassword && !emailSent ? temporaryPassword : null,
      emailSent: input.resetPassword ? emailSent : undefined,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireApiAdmin();
    const input = deleteUserSchema.parse(await request.json());
    if (input.userId === admin.id) throw new ApiError("Você não pode excluir a própria conta.", 400);

    const prisma = getPrisma();
    const target = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!target) throw new ApiError("Usuário não encontrado.", 404);
    if (target.role === "ADMIN") throw new ApiError("Não é possível excluir um administrador.", 400);

    // Exclusão real (cascade): remove o usuário e seus dados e LIBERA o e-mail para
    // novo cadastro. Logs de auditoria são preservados (userId vira nulo).
    await prisma.user.delete({ where: { id: input.userId } });
    await auditLog({ userId: admin.id, action: "admin.user_deleted", entity: "user", entityId: input.userId, metadata: { email: target.email } });

    return jsonOk({ deleted: true, userId: input.userId });
  } catch (error) {
    return handleRouteError(error);
  }
}
