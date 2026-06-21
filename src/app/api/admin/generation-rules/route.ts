import { NextRequest } from "next/server";
import { auditLog } from "@/lib/server/audit";
import { handleRouteError, jsonOk } from "@/lib/server/api";
import { requireApiAdmin } from "@/lib/server/api-auth";
import { getPrisma } from "@/lib/server/db";
import { generationRuleSchema } from "@/lib/validation";

export async function GET() {
  try {
    await requireApiAdmin();
    const rules = await getPrisma().generationRule.findMany({ orderBy: { updatedAt: "desc" } });
    return jsonOk({ rules });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireApiAdmin();
    const input = generationRuleSchema.parse(await request.json());
    const rule = await getPrisma().generationRule.upsert({
      where: { key: input.key },
      update: {
        title: input.title,
        body: input.body,
        isActive: input.isActive,
      },
      create: {
        key: input.key,
        title: input.title,
        body: input.body,
        isActive: input.isActive,
      },
    });

    await auditLog({ userId: admin.id, action: "admin.generation_rule_saved", entity: "generationRule", entityId: rule.id });
    return jsonOk({ rule });
  } catch (error) {
    return handleRouteError(error);
  }
}
