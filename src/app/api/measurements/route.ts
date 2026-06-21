import { NextRequest } from "next/server";
import { calculateTargets } from "@/lib/fitness/calculations";
import { jsonOk, handleRouteError } from "@/lib/server/api";
import { requireApiActiveUser } from "@/lib/server/api-auth";
import { getPrisma } from "@/lib/server/db";
import { profileToInput } from "@/lib/server/plans";
import { measurementSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await requireApiActiveUser();
    const measurements = await getPrisma().bodyMeasurement.findMany({
      where: { userId: user.id },
      orderBy: { date: "asc" },
    });
    return jsonOk({ measurements });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiActiveUser();
    const input = measurementSchema.parse(await request.json());
    const prisma = getPrisma();
    const measurement = await prisma.bodyMeasurement.create({
      data: { userId: user.id, ...input },
    });

    if (user.profile) {
      const nextProfile = {
        ...user.profile,
        weightKg: input.weightKg,
        waistCm: input.waistCm ?? user.profile.waistCm,
        hipCm: input.hipCm ?? user.profile.hipCm,
        chestCm: input.chestCm ?? user.profile.chestCm,
        armCm: input.armCm ?? user.profile.armCm,
        thighCm: input.thighCm ?? user.profile.thighCm,
        calfCm: input.calfCm ?? user.profile.calfCm,
        bodyFatPct: input.bodyFatPct ?? user.profile.bodyFatPct,
      };
      const metrics = calculateTargets(profileToInput(nextProfile, user.name));
      await prisma.userProfile.update({
        where: { userId: user.id },
        data: {
          weightKg: input.weightKg,
          waistCm: nextProfile.waistCm,
          hipCm: nextProfile.hipCm,
          chestCm: nextProfile.chestCm,
          armCm: nextProfile.armCm,
          thighCm: nextProfile.thighCm,
          calfCm: nextProfile.calfCm,
          bodyFatPct: nextProfile.bodyFatPct,
          targets: metrics.targets,
          formulaSnapshot: metrics.formulas,
        },
      });
    }

    return jsonOk({ measurement });
  } catch (error) {
    return handleRouteError(error);
  }
}
