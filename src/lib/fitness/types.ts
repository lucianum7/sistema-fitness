import type { TrainingDay, TrainingMethodology } from "./training-options";

export type Sex = "FEMALE" | "MALE" | "OTHER" | "NOT_INFORMED";

export type Objective =
  | "HYPERTROPHY"
  | "STRENGTH"
  | "ENDURANCE"
  | "CONDITIONING"
  | "FAT_LOSS"
  | "RECOMPOSITION"
  | "BEGINNER"
  | "RETURN_GRADUAL";

export type Experience = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type ActivityLevel = "SEDENTARY" | "LIGHT" | "MODERATE" | "VERY_ACTIVE";

export type ProfileInput = {
  name?: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  bodyFatPct?: number | null;
  waistCm?: number | null;
  hipCm?: number | null;
  chestCm?: number | null;
  armCm?: number | null;
  thighCm?: number | null;
  calfCm?: number | null;
  objective: Objective;
  experience: Experience;
  availableDays: number;
  trainingDays: TrainingDay[];
  trainingMethodology: TrainingMethodology;
  sessionMinutes: number;
  equipment: string[];
  routine?: string | null;
  activityLevel: ActivityLevel;
  sleepHours: number;
  waterLiters: number;
  foodPreferences: string[];
  allergies: string[];
  intolerances: string[];
  restrictions: string[];
  conditions: string[];
  injuries: string[];
  medications: string[];
  limitations: string[];
};

export type MacroTargets = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sodiumMgLimit: number;
  waterMl: number;
};

export type FitnessMetrics = {
  bmi: number;
  bmiCategory: string;
  bmr: number;
  tdee: number;
  activityFactor: number;
  activityLevel: ActivityLevel;
  activityLabel: string;
  goalAdjustmentPct: number;
  estimatedWeeklyWeightChangeKg: number;
  targets: MacroTargets;
  formulas: {
    bmi: string;
    bmr: string;
    tdee: string;
    calories: string;
    macros: string;
    water: string;
  };
};

export type SafetyScreening = {
  score: number;
  level: "LOW" | "MODERATE" | "HIGH";
  requiresProfessionalReview: boolean;
  flags: string[];
  guidance: string[];
};

export type ExerciseSeed = {
  externalId?: string | null;
  slug: string;
  name: string;
  category: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  level: Experience;
  contraindications: string[];
  limitations: string[];
  demoKind: string;
  imageUrl?: string | null;
  instructions: string[];
  commonErrors: string[];
  breathing: string;
  rangeOfMotion: string;
  care: string;
  metCode?: string | null;
  metDefault?: number | null;
  metLabel?: string | null;
  sourceMet?: string | null;
  metadata?: Record<string, unknown>;
  alternatives: string[];
};

export type FoodSeed = {
  externalId?: string | null;
  name: string;
  brand?: string | null;
  category: string;
  servingGrams: number;
  servingLabel: string;
  calories100g: number;
  protein100g: number;
  carbs100g: number;
  fat100g: number;
  fiber100g: number;
  netCarbs100g?: number | null;
  sodium100g: number;
  ironMg100g?: number | null;
  calciumMg100g?: number | null;
  vitaminKUg100g?: number | null;
  allergens: string[];
  restrictions: string[];
  source: string;
  dataVersion?: string | null;
  metadata?: Record<string, unknown>;
};

export type WorkoutExercise = {
  exerciseSlug: string;
  name: string;
  demoKind: string;
  imageUrl?: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  sets: number;
  reps: string;
  loadSuggestion: string;
  rir: string;
  rpe: string;
  restSeconds: number;
  tempo: string;
  met?: number;
  activeMinutes?: number;
  restMinutes?: number;
  estimatedGrossKcal?: number;
  estimatedNetKcal?: number;
  volumeReps?: number;
  notes: string;
  progression: string;
  substitutions: string[];
  instructions: string[];
  commonErrors: string[];
  breathing: string;
  rangeOfMotion: string;
  care: string;
};

export type WorkoutDay = {
  day: string;
  focus: string;
  warmup: string[];
  mobility: string[];
  exercises: WorkoutExercise[];
  cooldown: string[];
};

export type GeneratedWorkoutPlan = {
  title: string;
  objective: Objective;
  methodology?: TrainingMethodology;
  methodologyLabel?: string;
  weeks: number;
  sessionsPerWeek: number;
  days: WorkoutDay[];
  progressionRule: string;
  deloadRule: string;
  weeklyVolumeByMuscle: Record<string, number>;
  generationRules?: { title: string; body: string }[];
};

export type MealItem = {
  foodName: string;
  grams: number;
  householdMeasure: string;
  category: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sodiumMg: number;
  equivalents: string[];
};

export type Meal = {
  name: string;
  targetShare: number;
  items: MealItem[];
  totals: Omit<MealItem, "foodName" | "grams" | "householdMeasure" | "category" | "equivalents">;
};

export type NutritionDay = {
  day: string;
  meals: Meal[];
};

export type NutritionWeek = {
  weekNumber: number;
  days: NutritionDay[];
};

export type GeneratedNutritionPlan = {
  title: string;
  targets: MacroTargets;
  meals: Meal[];
  alerts: string[];
  shoppingList: { item: string; grams: number; category: string }[];
  schedule?: NutritionWeek[];
  durationDays?: number;
  generationMode?: "standard" | "immediate";
  requestText?: string | null;
};
