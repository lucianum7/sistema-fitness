import { startOfDay } from "date-fns";
import { NutritionPlanner } from "@/components/nutrition-planner";
import { calculateTargets } from "@/lib/fitness/calculations";
import type { FoodSeed, GeneratedNutritionPlan, MacroTargets, Meal, NutritionWeek } from "@/lib/fitness/types";
import { requireActiveAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/db";
import { profileToInput } from "@/lib/server/plans";

const immediateMealNames = ["Café da manhã", "Almoço", "Lanche", "Jantar"];

function immediateActionForMeal(mealName: string) {
  return `nutrition.immediate_generated.${mealName}`;
}

export default async function NutricaoPage() {
  const user = await requireActiveAccess();
  const prisma = getPrisma();
  const dayStart = startOfDay(new Date());
  const metrics = user.profile ? calculateTargets(profileToInput(user.profile, user.name)) : null;
  const [plan, foods, immediateUsageRows] = await Promise.all([
    prisma.nutritionPlan.findFirst({ where: { userId: user.id, status: { in: ["ACTIVE", "NEEDS_REVIEW"] } }, orderBy: { createdAt: "desc" } }),
    prisma.food.findMany({ orderBy: { name: "asc" } }),
    prisma.auditLog.findMany({
      where: {
        userId: user.id,
        action: { in: immediateMealNames.map(immediateActionForMeal) },
        createdAt: { gte: dayStart },
      },
      select: { action: true },
    }),
  ]);

  if (!plan) {
    return (
      <div className="soft-card rounded-[8px] p-6">
        <h1 className="text-3xl font-black">Nutrição</h1>
        <p className="mt-2 text-[var(--muted)]">Nenhum plano alimentar ativo encontrado.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <header>
        <p className="text-sm font-semibold text-[var(--primary)]">Cardápio e metas</p>
        <h1 className="text-3xl font-black md:text-4xl">{plan.title}</h1>
      </header>
      <NutritionPlanner
        initialPlan={{
          title: plan.title,
          targets: metrics?.targets ?? plan.targets as unknown as MacroTargets,
          meals: plan.meals as unknown as Meal[],
          alerts: plan.alerts,
          shoppingList: [],
          schedule: plan.schedule as unknown as NutritionWeek[],
          durationDays: plan.durationDays,
          generationMode: plan.generationMode as GeneratedNutritionPlan["generationMode"],
          requestText: plan.requestText,
        } satisfies GeneratedNutritionPlan}
        foods={foods as unknown as FoodSeed[]}
        initialImmediateUsesByMeal={Object.fromEntries(
          immediateMealNames.map((mealName) => [
            mealName,
            immediateUsageRows.filter((row) => row.action === immediateActionForMeal(mealName)).length,
          ]),
        )}
        profileSummary={{
          objective: user.profile?.objective ?? "RECOMPOSITION",
          calories: metrics?.targets.calories ?? 0,
          tdee: metrics?.tdee ?? 0,
          goalAdjustmentPct: metrics?.goalAdjustmentPct ?? 0,
        }}
      />
    </div>
  );
}
