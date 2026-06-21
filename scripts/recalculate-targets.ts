import "dotenv/config";
import { Prisma } from "../src/generated/prisma/client";
import { applyManualTargetOverrides, calculateTargets } from "../src/lib/fitness/calculations";
import type { MacroTargets } from "../src/lib/fitness/types";
import { getPrisma } from "../src/lib/server/db";
import { profileToInput } from "../src/lib/server/plans";

function overrides(value: Prisma.JsonValue): Partial<MacroTargets> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, item]) => typeof item === "number")) as Partial<MacroTargets>;
}

async function main() {
  const prisma = getPrisma();
  const profiles = await prisma.userProfile.findMany({ include: { user: { select: { name: true } } } });

  for (const profile of profiles) {
    const metrics = calculateTargets(profileToInput(profile, profile.user.name));
    const targets = applyManualTargetOverrides(metrics.targets, overrides(profile.manualTargetOverrides));
    await prisma.$transaction([
      prisma.userProfile.update({
        where: { id: profile.id },
        data: {
          formulaSnapshot: metrics.formulas as Prisma.InputJsonValue,
          targets: targets as Prisma.InputJsonValue,
        },
      }),
      prisma.nutritionPlan.updateMany({
        where: { userId: profile.userId, status: { in: ["ACTIVE", "NEEDS_REVIEW"] } },
        data: { targets: targets as Prisma.InputJsonValue },
      }),
    ]);
  }

  console.log(`Metas recalculadas para ${profiles.length} perfil(is).`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await getPrisma().$disconnect();
  process.exit(1);
});
