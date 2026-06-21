import type { Exercise, Food, UserProfile } from "@/generated/prisma/client";
import { calculateTargets } from "@/lib/fitness/calculations";
import { generateNutritionPlan } from "@/lib/fitness/nutrition-generator";
import { exerciseSeeds, foodSeeds } from "@/lib/fitness/seed-data";
import { screenHealth } from "@/lib/fitness/safety";
import { getTrainingMethodology, trainingDays as defaultTrainingDays } from "@/lib/fitness/training-options";
import type { ExerciseSeed, FoodSeed, ProfileInput } from "@/lib/fitness/types";
import { generateWorkoutPlan } from "@/lib/fitness/workout-generator";
import { getPrisma } from "./db";

function jsonObject(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function exerciseToSeed(exercise: Exercise): ExerciseSeed {
  return {
    externalId: exercise.externalId,
    slug: exercise.slug,
    name: exercise.name,
    category: exercise.category,
    primaryMuscles: exercise.primaryMuscles,
    secondaryMuscles: exercise.secondaryMuscles,
    equipment: exercise.equipment,
    level: exercise.level,
    contraindications: exercise.contraindications,
    limitations: exercise.limitations,
    demoKind: exercise.demoKind,
    imageUrl: exercise.imageUrl,
    instructions: exercise.instructions,
    commonErrors: exercise.commonErrors,
    breathing: exercise.breathing,
    rangeOfMotion: exercise.rangeOfMotion,
    care: exercise.care,
    metCode: exercise.metCode,
    metDefault: exercise.metDefault,
    metLabel: exercise.metLabel,
    sourceMet: exercise.sourceMet,
    metadata: jsonObject(exercise.metadata),
    alternatives: Array.isArray(exercise.alternatives) ? exercise.alternatives.filter((item): item is string => typeof item === "string") : [],
  };
}

function foodToSeed(food: Food): FoodSeed {
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

async function loadExerciseSource(prisma: ReturnType<typeof getPrisma>) {
  const exercises = await prisma.exercise.findMany({ orderBy: { name: "asc" } });
  return exercises.length > 0 ? exercises.map(exerciseToSeed) : exerciseSeeds;
}

async function loadFoodSource(prisma: ReturnType<typeof getPrisma>) {
  const foods = await prisma.food.findMany({ orderBy: { name: "asc" } });
  return foods.length > 0 ? foods.map(foodToSeed) : foodSeeds;
}

export function profileToInput(profile: UserProfile, name?: string): ProfileInput {
  const trainingDays = profile.trainingDays.length > 0 ? profile.trainingDays : [...defaultTrainingDays].slice(0, Math.min(Math.max(profile.availableDays, 2), 7));

  return {
    name,
    age: profile.age,
    sex: profile.sex,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    bodyFatPct: profile.bodyFatPct,
    waistCm: profile.waistCm,
    hipCm: profile.hipCm,
    chestCm: profile.chestCm,
    armCm: profile.armCm,
    thighCm: profile.thighCm,
    calfCm: profile.calfCm,
    objective: profile.objective,
    experience: profile.experience,
    availableDays: trainingDays.length,
    trainingDays: trainingDays as ProfileInput["trainingDays"],
    trainingMethodology: getTrainingMethodology(profile.trainingMethodology).value,
    sessionMinutes: profile.sessionMinutes,
    equipment: profile.equipment,
    routine: profile.routine,
    activityLevel: profile.activityLevel as ProfileInput["activityLevel"],
    sleepHours: profile.sleepHours,
    waterLiters: profile.waterLiters,
    foodPreferences: profile.foodPreferences,
    allergies: profile.allergies,
    intolerances: profile.intolerances,
    restrictions: profile.restrictions,
    conditions: profile.conditions,
    injuries: profile.injuries,
    medications: profile.medications,
    limitations: profile.limitations,
  };
}

export async function generatePlansForUser(userId: string) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user?.profile) throw new Error("Perfil não encontrado.");

  const profileInput = profileToInput(user.profile, user.name);
  const [exerciseSource, foodSource, generationRules] = await Promise.all([
    loadExerciseSource(prisma),
    loadFoodSource(prisma),
    prisma.generationRule.findMany({ where: { isActive: true }, orderBy: { updatedAt: "desc" } }),
  ]);
  const metrics = calculateTargets(profileInput);
  const safety = screenHealth(profileInput);
  const workout = {
    ...generateWorkoutPlan(profileInput, exerciseSource),
    generationRules: generationRules.map((rule) => ({ title: rule.title, body: rule.body })),
  };
  const nutrition = generateNutritionPlan(profileInput, metrics.targets, foodSource);

  await prisma.userProfile.update({
    where: { userId },
    data: {
      safetyScore: safety.score,
      safetyFlags: safety.flags,
      professionalGuidance: safety.requiresProfessionalReview,
      formulaSnapshot: metrics.formulas,
      targets: metrics.targets,
    },
  });

  const status = safety.requiresProfessionalReview ? "NEEDS_REVIEW" : "ACTIVE";
  const [workoutPlan, nutritionPlan] = await prisma.$transaction([
    prisma.workoutPlan.create({
      data: {
        userId,
        title: workout.title,
        objective: workout.objective,
        sessionsPerWeek: workout.sessionsPerWeek,
        weeks: workout.weeks,
        status,
        data: workout,
      },
    }),
    prisma.nutritionPlan.create({
      data: {
        userId,
        title: nutrition.title,
        status,
        targets: nutrition.targets,
        meals: nutrition.meals,
        schedule: nutrition.schedule ?? [],
        durationDays: nutrition.durationDays ?? 7,
        generationMode: nutrition.generationMode ?? "standard",
        requestText: nutrition.requestText ?? null,
        alerts: nutrition.alerts,
      },
    }),
  ]);

  return { metrics, safety, workoutPlan, nutritionPlan };
}

export async function generateWorkoutPlanForUser(userId: string) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user?.profile) throw new Error("Perfil nÃ£o encontrado.");

  const profileInput = profileToInput(user.profile, user.name);
  const [exerciseSource, generationRules] = await Promise.all([
    loadExerciseSource(prisma),
    prisma.generationRule.findMany({ where: { isActive: true }, orderBy: { updatedAt: "desc" } }),
  ]);
  const metrics = calculateTargets(profileInput);
  const safety = screenHealth(profileInput);
  const workout = {
    ...generateWorkoutPlan(profileInput, exerciseSource),
    generationRules: generationRules.map((rule) => ({ title: rule.title, body: rule.body })),
  };

  await prisma.userProfile.update({
    where: { userId },
    data: {
      safetyScore: safety.score,
      safetyFlags: safety.flags,
      professionalGuidance: safety.requiresProfessionalReview,
      formulaSnapshot: metrics.formulas,
      targets: metrics.targets,
    },
  });

  const workoutPlan = await prisma.workoutPlan.create({
    data: {
      userId,
      title: workout.title,
      objective: workout.objective,
      sessionsPerWeek: workout.sessionsPerWeek,
      weeks: workout.weeks,
      status: safety.requiresProfessionalReview ? "NEEDS_REVIEW" : "ACTIVE",
      data: workout,
    },
  });

  return { metrics, safety, workoutPlan };
}
