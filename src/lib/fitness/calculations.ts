import type { ActivityLevel, FitnessMetrics, MacroTargets, Objective, ProfileInput } from "./types";

const round = (value: number, precision = 0) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

const activityLevels: Record<ActivityLevel, { factor: number; label: string }> = {
  SEDENTARY: { factor: 1.2, label: "Sedentário" },
  LIGHT: { factor: 1.375, label: "Levemente ativo" },
  MODERATE: { factor: 1.55, label: "Moderadamente ativo" },
  VERY_ACTIVE: { factor: 1.725, label: "Muito ativo" },
};

export function getBmiCategory(bmi: number) {
  if (bmi < 18.5) return "Abaixo do peso";
  if (bmi < 25) return "Faixa considerada adequada";
  if (bmi < 30) return "Sobrepeso";
  if (bmi < 35) return "Obesidade grau I";
  if (bmi < 40) return "Obesidade grau II";
  return "Obesidade grau III";
}

export function getActivityFactor(level: ActivityLevel) {
  return activityLevels[level] ?? activityLevels.MODERATE;
}

function goalAdjustment(objective: Objective, bmi: number, bodyFatPct?: number | null) {
  if (objective === "FAT_LOSS") return bmi >= 30 ? -0.2 : -0.15;
  if (objective === "RECOMPOSITION") {
    const elevatedBodyFat = bodyFatPct != null && bodyFatPct >= 25;
    return bmi >= 25 || elevatedBodyFat ? -0.08 : -0.05;
  }
  if (objective === "HYPERTROPHY") return 0.08;
  if (objective === "STRENGTH") return 0.05;
  return 0;
}

function proteinTarget(profile: ProfileInput) {
  const leanMassKg = profile.bodyFatPct != null && profile.bodyFatPct > 3 && profile.bodyFatPct < 60
    ? profile.weightKg * (1 - profile.bodyFatPct / 100)
    : null;
  const isDeficit = profile.objective === "FAT_LOSS" || profile.objective === "RECOMPOSITION";
  const bodyWeightTarget = profile.weightKg * (isDeficit ? 1.8 : 1.6);
  const leanMassTarget = leanMassKg ? leanMassKg * (isDeficit ? 2.2 : 2) : 0;
  return round(Math.min(Math.max(bodyWeightTarget, leanMassTarget), profile.weightKg * 2.2));
}

export function calculateTargets(profile: ProfileInput): FitnessMetrics {
  const heightM = profile.heightCm / 100;
  const bmi = round(profile.weightKg / (heightM * heightM), 1);
  const sexOffset = profile.sex === "MALE" ? 5 : profile.sex === "FEMALE" ? -161 : -78;
  const bmr = round(10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + sexOffset);
  const activity = getActivityFactor(profile.activityLevel);
  const tdee = round(bmr * activity.factor);
  const adjustment = goalAdjustment(profile.objective, bmi, profile.bodyFatPct);
  const rawCalories = round(tdee * (1 + adjustment));
  const calories = adjustment < 0 ? Math.max(rawCalories, round(bmr * 1.05)) : rawCalories;
  const proteinG = proteinTarget(profile);
  const fatG = round(Math.max(profile.weightKg * 0.6, (calories * 0.25) / 9));
  const carbsG = round(Math.max((calories - proteinG * 4 - fatG * 9) / 4, 80));
  const fiberG = round(Math.max(25, (calories / 1000) * 14));
  const averageTrainingMinutesPerDay = profile.availableDays * profile.sessionMinutes / 7;
  const waterMl = round(profile.weightKg * 35 + averageTrainingMinutesPerDay * 7, -1);
  const estimatedWeeklyWeightChangeKg = round(((calories - tdee) * 7) / 7700, 2);

  const targets: MacroTargets = {
    calories,
    proteinG,
    carbsG,
    fatG,
    fiberG,
    sodiumMgLimit: 2300,
    waterMl,
  };

  return {
    bmi,
    bmiCategory: getBmiCategory(bmi),
    bmr,
    tdee,
    activityFactor: activity.factor,
    activityLevel: profile.activityLevel,
    activityLabel: activity.label,
    goalAdjustmentPct: round(adjustment * 100),
    estimatedWeeklyWeightChangeKg,
    targets,
    formulas: {
      bmi: `IMC = peso / altura² = ${profile.weightKg} / ${heightM.toFixed(2)}²`,
      bmr: `TMB por Mifflin-St Jeor = 10 × ${profile.weightKg} + 6,25 × ${profile.heightCm} - 5 × ${profile.age} ${sexOffset >= 0 ? "+" : ""} ${sexOffset}`,
      tdee: `Gasto diário estimado = TMB × ${activity.factor} (${activity.label})`,
      calories: `Meta calórica = gasto diário ${adjustment < 0 ? "−" : adjustment > 0 ? "+" : "sem ajuste"} ${Math.abs(round(adjustment * 100))}% para o objetivo`,
      macros: `Proteína entre 1,6 e 2,2 g/kg, gordura mínima de 0,6 g/kg e carboidratos nas calorias restantes`,
      water: `Água = 35 ml/kg + ajuste médio pela duração semanal dos treinos`,
    },
  };
}

export function applyManualTargetOverrides(targets: MacroTargets, overrides: Partial<MacroTargets>) {
  return {
    ...targets,
    ...Object.fromEntries(
      Object.entries(overrides).filter(([, value]) => typeof value === "number" && Number.isFinite(value)),
    ),
  };
}

export function recalculateByProgress(
  targets: MacroTargets,
  progress: { weightDeltaKg: number; adherencePct: number; weeks: number },
) {
  if (progress.weeks < 2) return targets;

  const adjusted = { ...targets };
  const weeklyChange = progress.weightDeltaKg / progress.weeks;
  const losingTooFast = weeklyChange < -0.01 * 70;
  const stalled = Math.abs(weeklyChange) < 0.001 * 70;
  const lowAdherence = progress.adherencePct < 80;

  if (!lowAdherence && losingTooFast) adjusted.calories += 100;
  if (!lowAdherence && stalled) adjusted.calories -= 100;
  return adjusted;
}
