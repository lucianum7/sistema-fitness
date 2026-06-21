import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { applyManualTargetOverrides, calculateTargets } from "@/lib/fitness/calculations";
import type { MacroTargets } from "@/lib/fitness/types";
import { auditLog } from "@/lib/server/audit";
import { ApiError, handleRouteError, jsonOk } from "@/lib/server/api";
import { requireApiUser } from "@/lib/server/api-auth";
import { getPrisma } from "@/lib/server/db";
import { profileToInput } from "@/lib/server/plans";
import { metabolicProfileSchema } from "@/lib/validation";

function targetOverrides(value: Prisma.JsonValue): Partial<MacroTargets> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => typeof item === "number" && Number.isFinite(item)),
  ) as Partial<MacroTargets>;
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireApiUser();
    if (!user.profile) throw new ApiError("Perfil do aluno nao encontrado.", 404);
    const input = metabolicProfileSchema.parse(await request.json());
    const nextProfile = {
      ...user.profile,
      ...input,
      bodyFatPct: input.bodyFatPct ?? user.profile.bodyFatPct,
    };
    const metrics = calculateTargets(profileToInput(nextProfile, user.name));
    const targets = applyManualTargetOverrides(metrics.targets, targetOverrides(user.profile.manualTargetOverrides));
    const weightChanged = input.weightKg !== user.profile.weightKg || nextProfile.bodyFatPct !== user.profile.bodyFatPct;
    const prisma = getPrisma();

    await prisma.$transaction(async (transaction) => {
      await transaction.userProfile.update({
        where: { userId: user.id },
        data: {
          age: input.age,
          sex: input.sex,
          heightCm: input.heightCm,
          weightKg: input.weightKg,
          bodyFatPct: nextProfile.bodyFatPct,
          objective: input.objective,
          activityLevel: input.activityLevel,
          formulaSnapshot: metrics.formulas as Prisma.InputJsonValue,
          targets: targets as Prisma.InputJsonValue,
        },
      });
      if (weightChanged) {
        await transaction.bodyMeasurement.create({
          data: {
            userId: user.id,
            weightKg: input.weightKg,
            bodyFatPct: nextProfile.bodyFatPct,
            notes: "Atualizacao pelo perfil metabolico.",
          },
        });
      }
    });

    await auditLog({
      userId: user.id,
      action: "profile.metabolic_updated",
      entity: "user_profile",
      entityId: user.profile.id,
      metadata: { objective: input.objective, recalculated: true },
    });

    return jsonOk({
      profile: input,
      metrics: { ...metrics, targets },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
