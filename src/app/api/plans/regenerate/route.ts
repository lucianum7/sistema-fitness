import { auditLog } from "@/lib/server/audit";
import { jsonOk, handleRouteError } from "@/lib/server/api";
import { requireApiActiveUser } from "@/lib/server/api-auth";
import { getPrisma } from "@/lib/server/db";
import { generatePlansForUser } from "@/lib/server/plans";

export async function POST() {
  try {
    const user = await requireApiActiveUser();
    const prisma = getPrisma();
    await prisma.$transaction([
      prisma.workoutPlan.updateMany({ where: { userId: user.id, status: "ACTIVE" }, data: { status: "ARCHIVED" } }),
      prisma.nutritionPlan.updateMany({ where: { userId: user.id, status: "ACTIVE" }, data: { status: "ARCHIVED" } }),
    ]);
    const plans = await generatePlansForUser(user.id);
    await auditLog({ userId: user.id, action: "plans.regenerated", entity: "user", entityId: user.id });
    return jsonOk(plans);
  } catch (error) {
    return handleRouteError(error);
  }
}
