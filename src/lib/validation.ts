import { z } from "zod";
import { getTrainingMethodology, trainingDays, trainingMethodologyValues } from "@/lib/fitness/training-options";

const listSchema = z.array(z.string().trim().min(1).max(80)).max(30).default([]);
const optionalNumber = z.preprocess((value) => (value === "" || value === null ? undefined : value), z.coerce.number().positive().optional());
const trainingDaySchema = z.enum(trainingDays);

export const profileSchema = z.object({
  age: z.coerce.number().int().min(12).max(90),
  sex: z.enum(["FEMALE", "MALE", "OTHER", "NOT_INFORMED"]),
  heightCm: z.coerce.number().min(120).max(230),
  weightKg: z.coerce.number().min(35).max(280),
  bodyFatPct: optionalNumber,
  waistCm: optionalNumber,
  hipCm: optionalNumber,
  chestCm: optionalNumber,
  armCm: optionalNumber,
  thighCm: optionalNumber,
  calfCm: optionalNumber,
  objective: z.enum(["HYPERTROPHY", "STRENGTH", "ENDURANCE", "CONDITIONING", "FAT_LOSS", "RECOMPOSITION", "BEGINNER", "RETURN_GRADUAL"]),
  experience: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  availableDays: z.coerce.number().int().min(2).max(7),
  trainingDays: z.array(trainingDaySchema).min(2).max(7).default(["Segunda", "Terça", "Quarta", "Quinta"]),
  trainingMethodology: z.enum(trainingMethodologyValues).default("AUTO"),
  sessionMinutes: z.coerce.number().int().min(25).max(120),
  equipment: listSchema,
  routine: z.string().trim().max(500).optional().nullable(),
  activityLevel: z.enum(["SEDENTARY", "LIGHT", "MODERATE", "VERY_ACTIVE"]).default("MODERATE"),
  sleepHours: z.coerce.number().min(0).max(14),
  waterLiters: z.coerce.number().min(0).max(10),
  foodPreferences: listSchema,
  allergies: listSchema,
  intolerances: listSchema,
  restrictions: listSchema,
  conditions: listSchema,
  injuries: listSchema,
  medications: listSchema,
  limitations: listSchema,
}).superRefine((value, context) => {
  const methodology = getTrainingMethodology(value.trainingMethodology);
  if (value.trainingDays.length < methodology.minDays) {
    context.addIssue({
      code: "custom",
      path: ["trainingDays"],
      message: `${methodology.label} exige pelo menos ${methodology.minDays} dias de treino.`,
    });
  }
});

export const trainingPreferencesSchema = z.object({
  trainingDays: z.array(trainingDaySchema).min(2).max(7),
  trainingMethodology: z.enum(trainingMethodologyValues),
  experience: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
}).superRefine((value, context) => {
  const methodology = getTrainingMethodology(value.trainingMethodology);
  if (value.trainingDays.length < methodology.minDays) {
    context.addIssue({
      code: "custom",
      path: ["trainingDays"],
      message: `${methodology.label} exige pelo menos ${methodology.minDays} dias de treino.`,
    });
  }
});

export const metabolicProfileSchema = z.object({
  age: z.coerce.number().int().min(12).max(90),
  sex: z.enum(["FEMALE", "MALE", "OTHER", "NOT_INFORMED"]),
  heightCm: z.coerce.number().min(120).max(230),
  weightKg: z.coerce.number().min(35).max(280),
  bodyFatPct: optionalNumber.refine((value) => value === undefined || value <= 75, "Percentual de gordura invalido."),
  objective: z.enum(["HYPERTROPHY", "STRENGTH", "ENDURANCE", "CONDITIONING", "FAT_LOSS", "RECOMPOSITION", "BEGINNER", "RETURN_GRADUAL"]),
  activityLevel: z.enum(["SEDENTARY", "LIGHT", "MODERATE", "VERY_ACTIVE"]),
});

export const generationRuleSchema = z.object({
  id: z.string().min(1).optional(),
  key: z.string().trim().min(2).max(80).regex(/^[a-z0-9_.-]+$/),
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(20).max(6000),
  isActive: z.boolean().default(true),
});

// Cadastro mínimo: cria a conta sem perfil. A avaliação (perfil + saúde) é
// preenchida depois, já dentro da sessão (ver onboardingSchema).
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180).toLowerCase(),
  password: z.string().min(10).max(120),
  consents: z.object({
    terms: z.literal(true),
    privacy: z.literal(true),
  }),
});

// Avaliação dentro da sessão: cria o UserProfile e gera os planos.
export const onboardingSchema = z.object({
  profile: profileSchema,
  consents: z.object({
    healthScreening: z.literal(true),
    dataProcessing: z.literal(true),
    professionalGuidance: z.boolean().default(false),
  }),
});

export const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1).max(120),
});

export const tokenSchema = z.object({
  token: z.string().min(20).max(256),
});

export const requestResetSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
});

export const resetPasswordSchema = tokenSchema.extend({
  password: z.string().min(10).max(120),
});

export const targetOverrideSchema = z.object({
  calories: z.coerce.number().min(900).max(6000).optional(),
  proteinG: z.coerce.number().min(30).max(400).optional(),
  carbsG: z.coerce.number().min(40).max(800).optional(),
  fatG: z.coerce.number().min(20).max(250).optional(),
  fiberG: z.coerce.number().min(10).max(90).optional(),
  sodiumMgLimit: z.coerce.number().min(1000).max(6000).optional(),
  waterMl: z.coerce.number().min(1000).max(9000).optional(),
});

export const measurementSchema = z.object({
  date: z.coerce.date().optional(),
  weightKg: z.coerce.number().min(35).max(280),
  waistCm: optionalNumber,
  hipCm: optionalNumber,
  chestCm: optionalNumber,
  armCm: optionalNumber,
  thighCm: optionalNumber,
  calfCm: optionalNumber,
  bodyFatPct: optionalNumber,
  notes: z.string().trim().max(500).optional(),
});

export const waterLogSchema = z.object({
  amountMl: z.coerce.number().int().min(50).max(3000),
});

export const sleepLogSchema = z.object({
  date: z.coerce.date().optional(),
  hours: z.coerce.number().min(0).max(14),
  quality: z.coerce.number().int().min(1).max(5),
  notes: z.string().trim().max(500).optional(),
});

export const mealLogSchema = z.object({
  mealName: z.string().trim().min(2).max(80),
  items: z.array(z.unknown()).min(1).max(30),
  totals: z.record(z.string(), z.unknown()),
});

export const supportTicketSchema = z.object({
  subject: z.string().trim().min(3).max(120).default("Suporte Sistema Fitness"),
  message: z.string().trim().min(10).max(1200),
});

export const supportReplySchema = z.object({
  ticketId: z.string().min(1),
  message: z.string().trim().min(2).max(1200).optional(),
  status: z.enum(["open", "answered", "closed"]).optional(),
});

export const nutritionGenerateSchema = z.object({
  mode: z.enum(["brazilian", "immediate"]),
  mealName: z.enum(["Café da manhã", "Almoço", "Lanche", "Jantar"]).optional(),
  availableFoods: z.string().trim().max(800).optional(),
});

export const workoutSessionSchema = z.object({
  planId: z.string().optional().nullable(),
  workoutName: z.string().trim().min(2).max(120),
  perceivedEffort: z.coerce.number().int().min(1).max(10).optional(),
  totalVolumeKg: z.coerce.number().min(0).max(100000).default(0),
  notes: z.string().trim().max(800).optional(),
  sets: z.array(z.object({
    exerciseId: z.string().optional().nullable(),
    setIndex: z.coerce.number().int().min(1).max(20),
    reps: z.coerce.number().int().min(1).max(100),
    loadKg: z.coerce.number().min(0).max(1000),
    rir: z.coerce.number().int().min(0).max(10).optional(),
    rpe: z.coerce.number().min(1).max(10).optional(),
    notes: z.string().trim().max(300).optional(),
  })).min(1).max(80),
});

export const workoutExerciseReplacementSchema = z.object({
  planId: z.string().min(1),
  dayIndex: z.coerce.number().int().min(0).max(6),
  exerciseSlug: z.string().trim().min(2).max(140),
  replacementSlug: z.string().trim().min(2).max(140),
});

export const reviewPlanSchema = z.object({
  type: z.enum(["workout", "nutrition"]),
  planId: z.string().min(1),
  status: z.enum(["ACTIVE", "NEEDS_REVIEW", "ARCHIVED"]),
  reviewNotes: z.string().trim().max(1000).optional(),
});
