import { NextRequest } from "next/server";
import { applyManualTargetOverrides } from "@/lib/fitness/calculations";
import type { MacroTargets } from "@/lib/fitness/types";
import { ApiError, jsonOk, handleRouteError } from "@/lib/server/api";
import { requireApiActiveUser } from "@/lib/server/api-auth";
import { getPrisma } from "@/lib/server/db";
import { targetOverrideSchema } from "@/lib/validation";

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireApiActiveUser();
    if (!user.profile) throw new ApiError("Perfil nÃ£o encontrado.", 404);

    const overrides = targetOverrideSchema.parse(await request.json());
    const currentTargets = user.profile.targets as MacroTargets;
    const targets = applyManualTargetOverrides(currentTargets, overrides);

    await getPrisma().userProfile.update({
      where: { userId: user.id },
      data: {
        targets,
        manualTargetOverrides: overrides,
      },
    });

    await getPrisma().nutritionPlan.updateMany({
      where: { userId: user.id, status: "ACTIVE" },
      data: { targets },
    });

    return jsonOk({ targets });
  } catch (error) {
    return handleRouteError(error);
  }
}
