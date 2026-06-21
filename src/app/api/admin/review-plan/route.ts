import { NextRequest } from "next/server";
import { auditLog } from "@/lib/server/audit";
import { jsonOk, handleRouteError } from "@/lib/server/api";
import { requireApiAdmin } from "@/lib/server/api-auth";
import { getPrisma } from "@/lib/server/db";
import { reviewPlanSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireApiAdmin();
    const input = reviewPlanSchema.parse(await request.json());
    const prisma = getPrisma();

    const data = {
      status: input.status,
      reviewNotes: input.reviewNotes,
      reviewedById: admin.id,
      reviewedAt: new Date(),
    };

    const plan =
      input.type === "workout"
        ? await prisma.workoutPlan.update({ where: { id: input.planId }, data })
        : await prisma.nutritionPlan.update({ where: { id: input.planId }, data });

    await auditLog({ userId: admin.id, action: "admin.plan_reviewed", entity: input.type, entityId: input.planId });
    return jsonOk({ plan });
  } catch (error) {
    return handleRouteError(error);
  }
}
