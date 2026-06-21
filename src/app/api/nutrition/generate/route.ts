import { NextRequest } from "next/server";
import { startOfDay } from "date-fns";
import { Prisma } from "@/generated/prisma/client";
import { applyManualTargetOverrides, calculateTargets } from "@/lib/fitness/calculations";
import {
  generateImmediateMeal,
  generateNutritionPlan,
  shoppingListFromMeals,
} from "@/lib/fitness/nutrition-generator";
import { foodSeeds } from "@/lib/fitness/seed-data";
import type { FoodSeed, GeneratedNutritionPlan, MacroTargets, Meal, NutritionWeek } from "@/lib/fitness/types";
import { auditLog } from "@/lib/server/audit";
import { ApiError, handleRouteError, jsonOk } from "@/lib/server/api";
import { requireApiActiveUser } from "@/lib/server/api-auth";
import { getPrisma } from "@/lib/server/db";
import { profileToInput } from "@/lib/server/plans";
import { nutritionGenerateSchema } from "@/lib/validation";

const immediateMealLimit = 2;

function jsonObject(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function mapFood(food: {
  name: string;
  brand: string | null;
  category: string;
  servingGrams: number;
  servingLabel: string;
  calories100g: number;
  protein100g: number;
  carbs100g: number;
  fat100g: number;
  fiber100g: number;
  netCarbs100g: number | null;
  sodium100g: number;
  ironMg100g: number | null;
  calciumMg100g: number | null;
  vitaminKUg100g: number | null;
  allergens: string[];
  restrictions: string[];
  source: string;
  dataVersion: string | null;
  metadata: unknown;
}): FoodSeed {
  return {
    name: food.name,
    brand: food.brand,
    category: food.category,
    servingGrams: food.servingGrams,
    servingLabel: food.servingLabel,
    calories100g: food.calories100g,
    protein100g: food.protein100g,
    carbs100g: food.carbs100g,
    fat100g: food.fat100g,
    fiber100g: food.fiber100g,
    netCarbs100g: food.netCarbs100g,
    sodium100g: food.sodium100g,
    ironMg100g: food.ironMg100g,
    calciumMg100g: food.calciumMg100g,
    vitaminKUg100g: food.vitaminKUg100g,
    allergens: food.allergens,
    restrictions: food.restrictions,
    source: food.source,
    dataVersion: food.dataVersion,
    metadata: jsonObject(food.metadata),
  };
}

function immediateActionForMeal(mealName: string) {
  return `nutrition.immediate_generated.${mealName}`;
}

function planResponse(plan: GeneratedNutritionPlan, immediateUsesByMeal: Record<string, number> = {}) {
  return {
    plan,
    immediateUsesByMeal,
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiActiveUser();
    if (!user.profile) throw new ApiError("Perfil nÃ£o encontrado.", 404);

    const input = nutritionGenerateSchema.parse(await request.json());
    const prisma = getPrisma();
    const requestedMealName = input.mealName ?? "AlmoÃ§o";
    const immediateAction = immediateActionForMeal(requestedMealName);
    const dayStart = startOfDay(new Date());
    const [foods, activePlan, immediateUsesToday] = await Promise.all([
      prisma.food.findMany({ orderBy: { name: "asc" } }),
      prisma.nutritionPlan.findFirst({ where: { userId: user.id, status: { in: ["ACTIVE", "NEEDS_REVIEW"] } }, orderBy: { createdAt: "desc" } }),
      input.mode === "immediate"
        ? prisma.auditLog.count({
            where: {
              userId: user.id,
              action: immediateAction,
              createdAt: { gte: dayStart },
            },
          })
        : Promise.resolve(0),
    ]);
    if (input.mode === "immediate" && immediateUsesToday >= immediateMealLimit) {
      throw new ApiError(`Limite diario de ${immediateMealLimit} geracoes para ${requestedMealName} atingido.`, 429);
    }

    const foodSource = foods.length > 0 ? foods.map(mapFood) : foodSeeds;
    const profile = profileToInput(user.profile, user.name);
    const overrides = typeof user.profile.manualTargetOverrides === "object" && user.profile.manualTargetOverrides !== null && !Array.isArray(user.profile.manualTargetOverrides)
      ? user.profile.manualTargetOverrides as Partial<MacroTargets>
      : {};
    const targets = applyManualTargetOverrides(calculateTargets(profile).targets, overrides);
    const currentMeals = activePlan?.meals as unknown as Meal[] | undefined;
    const currentPlan: GeneratedNutritionPlan | null = activePlan
      ? {
          title: activePlan.title,
          targets: activePlan.targets as unknown as MacroTargets,
          meals: currentMeals ?? [],
          alerts: activePlan.alerts,
          shoppingList: [],
          schedule: activePlan.schedule as unknown as NutritionWeek[],
          durationDays: activePlan.durationDays,
          generationMode: activePlan.generationMode as GeneratedNutritionPlan["generationMode"],
          requestText: activePlan.requestText,
        }
      : null;

    const nextPlan =
      input.mode === "immediate"
        ? (() => {
            if (!currentPlan) throw new ApiError("Nenhum plano alimentar ativo encontrado.", 404);
            const mealName = requestedMealName;
            const availableFoods = input.availableFoods ?? "";
            const meal = generateImmediateMeal(profile, targets, foodSource, mealName, availableFoods);
            const meals = currentPlan.meals.map((item) => (item.name === mealName ? meal : item));
            return {
              ...currentPlan,
              title: `Refeições atuais - ${mealName}`,
              meals,
              shoppingList: shoppingListFromMeals(meals),
              schedule: [],
              durationDays: 1,
              generationMode: "immediate" as const,
              requestText: null,
            };
          })()
        : generateNutritionPlan(profile, targets, foodSource);

    const savedPlan = activePlan
      ? await prisma.nutritionPlan.update({
          where: { id: activePlan.id },
          data: {
            title: nextPlan.title,
            targets: nextPlan.targets as unknown as Prisma.InputJsonValue,
            meals: nextPlan.meals as unknown as Prisma.InputJsonValue,
            schedule: (nextPlan.schedule ?? []) as unknown as Prisma.InputJsonValue,
            durationDays: nextPlan.durationDays ?? 7,
            generationMode: nextPlan.generationMode ?? "standard",
            requestText: nextPlan.requestText ?? null,
            alerts: nextPlan.alerts,
          },
        })
      : await prisma.nutritionPlan.create({
          data: {
            userId: user.id,
            title: nextPlan.title,
            status: "ACTIVE",
            targets: nextPlan.targets as unknown as Prisma.InputJsonValue,
            meals: nextPlan.meals as unknown as Prisma.InputJsonValue,
            schedule: (nextPlan.schedule ?? []) as unknown as Prisma.InputJsonValue,
            durationDays: nextPlan.durationDays ?? 7,
            generationMode: nextPlan.generationMode ?? "standard",
            requestText: nextPlan.requestText ?? null,
            alerts: nextPlan.alerts,
          },
        });

    if (input.mode === "immediate") {
      await auditLog({ userId: user.id, action: immediateAction, entity: "nutritionPlan", entityId: savedPlan.id });
    } else {
      await auditLog({ userId: user.id, action: `nutrition.${input.mode}_generated`, entity: "nutritionPlan", entityId: savedPlan.id });
    }

    return jsonOk(
      planResponse(
        nextPlan,
        input.mode === "immediate" ? { [requestedMealName]: immediateUsesToday + 1 } : {},
      ),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
