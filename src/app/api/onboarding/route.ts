import { NextRequest } from "next/server";
import { calculateTargets } from "@/lib/fitness/calculations";
import { screenHealth } from "@/lib/fitness/safety";
import { auditLog } from "@/lib/server/audit";
import { jsonError, jsonOk, handleRouteError } from "@/lib/server/api";
import { requireApiUser } from "@/lib/server/api-auth";
import { hashIp } from "@/lib/server/crypto";
import { getPrisma } from "@/lib/server/db";
import { generatePlansForUser } from "@/lib/server/plans";
import { getClientIp, getUserAgent } from "@/lib/server/request";
import { onboardingSchema } from "@/lib/validation";

// Avaliação concluída dentro da sessão: cria o UserProfile, registra a medida
// inicial, salva os consentimentos de saúde e gera treino + nutrição.
export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser();
    if (user.profile) return jsonError("Avaliação já concluída.", 409);

    const input = onboardingSchema.parse(await request.json());
    const profile = { ...input.profile, availableDays: input.profile.trainingDays.length };
    const safety = screenHealth(profile);
    if (safety.requiresProfessionalReview && !input.consents.professionalGuidance) {
      return jsonError("Confirme a orientação profissional antes de gerar seus planos.", 422, safety);
    }

    const prisma = getPrisma();
    const ipHash = hashIp(getClientIp(request));
    const userAgent = getUserAgent(request);
    const metrics = calculateTargets(profile);

    await prisma.userProfile.create({
      data: {
        userId: user.id,
        ...profile,
        bodyFatPct: profile.bodyFatPct ?? null,
        waistCm: profile.waistCm ?? null,
        hipCm: profile.hipCm ?? null,
        chestCm: profile.chestCm ?? null,
        armCm: profile.armCm ?? null,
        thighCm: profile.thighCm ?? null,
        calfCm: profile.calfCm ?? null,
        routine: profile.routine ?? null,
        safetyScore: safety.score,
        safetyFlags: safety.flags,
        professionalGuidance: safety.requiresProfessionalReview,
        formulaSnapshot: metrics.formulas,
        targets: metrics.targets,
      },
    });

    await prisma.bodyMeasurement.create({
      data: {
        userId: user.id,
        weightKg: profile.weightKg,
        waistCm: profile.waistCm ?? null,
        hipCm: profile.hipCm ?? null,
        chestCm: profile.chestCm ?? null,
        armCm: profile.armCm ?? null,
        thighCm: profile.thighCm ?? null,
        calfCm: profile.calfCm ?? null,
        bodyFatPct: profile.bodyFatPct ?? null,
        notes: "Registro inicial da avaliação.",
      },
    });

    await prisma.consent.createMany({
      data: [
        { userId: user.id, type: "HEALTH_SCREENING" as const, version: "2026-06", ipHash, userAgent },
        { userId: user.id, type: "DATA_PROCESSING" as const, version: "2026-06", ipHash, userAgent },
        ...(input.consents.professionalGuidance
          ? [{ userId: user.id, type: "PROFESSIONAL_GUIDANCE" as const, version: "2026-06", ipHash, userAgent }]
          : []),
      ],
      skipDuplicates: true,
    });

    const plans = await generatePlansForUser(user.id);
    await auditLog({ userId: user.id, action: "onboarding.completed", entity: "user_profile", entityId: user.id, ipHash });

    return jsonOk({ metrics: plans.metrics, safety: plans.safety });
  } catch (error) {
    return handleRouteError(error);
  }
}
