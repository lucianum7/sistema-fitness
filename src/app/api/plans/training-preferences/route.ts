import { NextRequest } from "next/server";
import { auditLog } from "@/lib/server/audit";
import { handleRouteError, jsonOk } from "@/lib/server/api";
import { requireApiActiveUser } from "@/lib/server/api-auth";
import { getPrisma } from "@/lib/server/db";
import { generatePlansForUser } from "@/lib/server/plans";
import { trainingPreferencesSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiActiveUser();
    const input = trainingPreferencesSchema.parse(await request.json());
    const prisma = getPrisma();

    await prisma.$transaction([
      prisma.userProfile.update({
        where: { userId: user.id },
        data: {
          trainingDays: input.trainingDays,
          availableDays: input.trainingDays.length,
          trainingMethodology: input.trainingMethodology,
          experience: input.experience,
        },
      }),
      prisma.workoutPlan.updateMany({ where: { userId: user.id, status: { in: ["ACTIVE", "NEEDS_REVIEW"] } }, data: { status: "ARCHIVED" } }),
      prisma.nutritionPlan.updateMany({ where: { userId: user.id, status: { in: ["ACTIVE", "NEEDS_REVIEW"] } }, data: { status: "ARCHIVED" } }),
    ]);

    const plans = await generatePlansForUser(user.id);
    await auditLog({
      userId: user.id,
      action: "plans.training_preferences_updated",
      entity: "user",
      entityId: user.id,
      metadata: { trainingDays: input.trainingDays, trainingMethodology: input.trainingMethodology, experience: input.experience },
    });

    return jsonOk({
      workoutPlanId: plans.workoutPlan.id,
      nutritionPlanId: plans.nutritionPlan.id,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
