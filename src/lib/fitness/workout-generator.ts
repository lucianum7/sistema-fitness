import { getTrainingMethodology, trainingDays } from "./training-options";
import type { ExerciseSeed, GeneratedWorkoutPlan, Objective, ProfileInput, WorkoutDay } from "./types";

const fallbackFocusByDays: Record<number, string[]> = {
  2: ["Corpo inteiro A", "Corpo inteiro B"],
  3: ["Corpo inteiro A", "Superior", "Inferior"],
  4: ["Superior A", "Inferior A", "Superior B", "Inferior B"],
  5: ["Empurrar", "Puxar", "Pernas", "Superior completo", "Inferior técnico"],
  6: ["Empurrar A", "Puxar A", "Pernas A", "Empurrar B", "Puxar B", "Pernas B"],
  7: ["Empurrar A", "Puxar A", "Pernas A", "Superior técnico", "Inferior técnico", "Condicionamento", "Mobilidade e core"],
};

const methodologyFocus: Record<string, string[]> = {
  FULL_BODY: ["Corpo inteiro A", "Corpo inteiro B", "Corpo inteiro C"],
  AB: ["Superior", "Inferior"],
  ABC: ["Peito, ombros e tríceps", "Costas e bíceps", "Pernas e core"],
  ABCD: ["Peito e tríceps", "Costas e bíceps", "Pernas", "Ombros e core"],
  ABCDE: ["Peito", "Costas", "Pernas", "Ombros", "Braços e core"],
  UPPER_LOWER: ["Superior A", "Inferior A", "Superior B", "Inferior B"],
  PUSH_PULL_LEGS: ["Empurrar", "Puxar", "Pernas"],
  FIVE_BY_FIVE: ["Força A", "Força B", "Força C"],
  POWERLIFTING: ["Agachamento", "Supino", "Levantamento terra", "Acessórios técnicos"],
  GLUTES: ["Glúteos e posteriores", "Superior", "Glúteos e quadríceps"],
  POSTERIOR_CHAIN: ["Posteriores e glúteos", "Costas e core", "Terra e acessórios"],
  CALISTHENICS: ["Empurrar corporal", "Puxar corporal", "Pernas e core"],
  KETTLEBELL: ["Kettlebell força", "Kettlebell potência", "Kettlebell condicionamento"],
  CIRCUIT: ["Circuito A", "Circuito B", "Circuito C"],
};

const focusMuscles: Record<string, string[]> = {
  "Corpo inteiro A": ["quadriceps", "peitoral", "dorsais", "core"],
  "Corpo inteiro B": ["gluteos", "posteriores", "deltoides", "bracos"],
  "Corpo inteiro C": ["quadriceps", "dorsais", "gluteos", "triceps"],
  Superior: ["peitoral", "dorsais", "deltoides", "biceps", "triceps"],
  Inferior: ["quadriceps", "gluteos", "posteriores", "panturrilhas", "core"],
  "Superior A": ["peitoral", "dorsais", "deltoides", "triceps"],
  "Inferior A": ["quadriceps", "gluteos", "core"],
  "Superior B": ["dorsais", "peitoral", "biceps", "triceps"],
  "Inferior B": ["posteriores", "gluteos", "quadriceps", "panturrilhas"],
  Empurrar: ["peitoral", "deltoides", "triceps"],
  Puxar: ["dorsais", "romboides", "biceps"],
  Pernas: ["quadriceps", "posteriores", "gluteos", "panturrilhas"],
  "Superior completo": ["peitoral", "dorsais", "deltoides", "biceps", "triceps"],
  "Inferior técnico": ["quadriceps", "gluteos", "posteriores", "core"],
  "Empurrar A": ["peitoral", "deltoides", "triceps"],
  "Puxar A": ["dorsais", "romboides", "biceps"],
  "Pernas A": ["quadriceps", "gluteos", "core"],
  "Empurrar B": ["peitoral", "deltoides", "triceps"],
  "Puxar B": ["dorsais", "romboides", "biceps"],
  "Pernas B": ["posteriores", "gluteos", "quadriceps"],
  "Superior técnico": ["peitoral", "dorsais", "deltoides", "core"],
  Condicionamento: ["quadriceps", "gluteos", "dorsais", "core"],
  "Mobilidade e core": ["core", "gluteos", "deltoides", "panturrilhas"],
  "Peito, ombros e tríceps": ["peitoral", "deltoides", "triceps"],
  "Costas e bíceps": ["dorsais", "romboides", "biceps"],
  "Pernas e core": ["quadriceps", "posteriores", "gluteos", "core"],
  "Peito e tríceps": ["peitoral", "triceps", "deltoides"],
  "Ombros e core": ["deltoides", "core", "triceps"],
  Peito: ["peitoral", "triceps", "deltoides"],
  Costas: ["dorsais", "romboides", "biceps"],
  Ombros: ["deltoides", "triceps", "core"],
  "Braços e core": ["biceps", "triceps", "core"],
  "Força A": ["quadriceps", "peitoral", "dorsais"],
  "Força B": ["posteriores", "gluteos", "deltoides"],
  "Força C": ["quadriceps", "peitoral", "posteriores"],
  Agachamento: ["quadriceps", "gluteos", "core"],
  Supino: ["peitoral", "triceps", "deltoides"],
  "Levantamento terra": ["posteriores", "gluteos", "dorsais", "core"],
  "Acessórios técnicos": ["dorsais", "deltoides", "core", "panturrilhas"],
  "Glúteos e posteriores": ["gluteos", "posteriores", "core"],
  "Glúteos e quadríceps": ["gluteos", "quadriceps", "panturrilhas"],
  "Posteriores e glúteos": ["posteriores", "gluteos", "lombar"],
  "Costas e core": ["dorsais", "romboides", "core"],
  "Terra e acessórios": ["posteriores", "gluteos", "dorsais"],
  "Empurrar corporal": ["peitoral", "deltoides", "triceps", "core"],
  "Puxar corporal": ["dorsais", "romboides", "biceps", "core"],
  "Kettlebell força": ["quadriceps", "gluteos", "core"],
  "Kettlebell potência": ["posteriores", "gluteos", "deltoides"],
  "Kettlebell condicionamento": ["quadriceps", "dorsais", "core"],
  "Circuito A": ["quadriceps", "peitoral", "core"],
  "Circuito B": ["dorsais", "gluteos", "deltoides"],
  "Circuito C": ["posteriores", "biceps", "triceps"],
};

const round = (value: number, precision = 0) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

function objectiveTitle(objective: Objective) {
  const names: Record<Objective, string> = {
    HYPERTROPHY: "Hipertrofia",
    STRENGTH: "Força",
    ENDURANCE: "Resistência",
    CONDITIONING: "Condicionamento",
    FAT_LOSS: "Emagrecimento",
    RECOMPOSITION: "Recomposição",
    BEGINNER: "Iniciante",
    RETURN_GRADUAL: "Retorno gradual",
  };
  return names[objective];
}

function setPrescription(objective: Objective, experience: ProfileInput["experience"]) {
  if (objective === "STRENGTH") return { sets: experience === "ADVANCED" ? 5 : 4, reps: "3-6", rir: "2", rpe: "7-8", restSeconds: 150, tempo: "2-1-1-0" };
  if (objective === "ENDURANCE" || objective === "CONDITIONING") return { sets: 3, reps: "12-18", rir: "2-3", rpe: "6-7", restSeconds: 60, tempo: "2-0-2-0" };
  if (objective === "RETURN_GRADUAL" || objective === "BEGINNER") return { sets: 2, reps: "10-12", rir: "3-4", rpe: "5-6", restSeconds: 75, tempo: "2-1-2-0" };
  return { sets: experience === "ADVANCED" ? 4 : 3, reps: "8-12", rir: "1-3", rpe: "7-8", restSeconds: 90, tempo: "3-1-1-0" };
}

function hasAvailableEquipment(exercise: ExerciseSeed, equipment: string[]) {
  const normalized = equipment.map((item) => item.toLowerCase());
  return (
    normalized.includes("academia completa") ||
    exercise.equipment.some((item) => normalized.some((entry) => entry.includes(item.toLowerCase()) || item.toLowerCase().includes(entry))) ||
    exercise.equipment.includes("peso corporal")
  );
}

function isAllowed(exercise: ExerciseSeed, profile: ProfileInput) {
  const limitations = [...profile.limitations, ...profile.injuries].join(" ").toLowerCase();
  const blockedByLimit = exercise.limitations.some((limitation) => limitations.includes(limitation.toLowerCase()));
  const blockedByContra = exercise.contraindications.some((item) => limitations.includes(item.toLowerCase()));
  const blockedByLevel =
    profile.experience === "BEGINNER"
      ? exercise.level === "ADVANCED"
      : profile.experience === "INTERMEDIATE"
        ? false
        : false;
  return hasAvailableEquipment(exercise, profile.equipment) && !blockedByLimit && !blockedByContra && !blockedByLevel;
}

function normalizedName(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

const simpleTermsByMuscle: Record<string, string[]> = {
  peitoral: ["supino reto", "supino inclinado", "supino com halteres", "crucifixo", "flexao"],
  deltoides: ["desenvolvimento", "elevacao lateral", "elevacao frontal", "face pull"],
  triceps: ["triceps na corda", "triceps corda", "extensao de triceps", "triceps testa", "mergulho assistido"],
  dorsais: ["puxada", "remada", "barra fixa"],
  romboides: ["remada", "face pull", "crucifixo inverso"],
  biceps: ["rosca direta", "rosca alternada", "rosca martelo"],
  quadriceps: ["agachamento", "leg press", "cadeira extensora"],
  posteriores: ["mesa flexora", "levantamento terra romeno", "stiff"],
  gluteos: ["hip thrust", "ponte", "cadeira abdutora", "agachamento"],
  panturrilhas: ["panturrilha"],
  core: ["prancha", "abdominal", "dead bug"],
};

function commonExerciseScore(exercise: ExerciseSeed, profile: ProfileInput) {
  const name = normalizedName(exercise.name);
  const simpleTerms = [
    "supino reto",
    "supino inclinado",
    "supino com halteres",
    "puxada",
    "remada",
    "agachamento",
    "leg press",
    "cadeira extensora",
    "mesa flexora",
    "desenvolvimento",
    "elevação lateral",
    "rosca direta",
    "triceps",
    "prancha",
    "panturrilha",
    "hip thrust",
  ];
  const advancedTerms = ["olimpico", "arranco", "arremesso", "pliometrico", "parada de maos", "snatch", "clean", "jerk"];
  const common = simpleTerms.some((term) => name.includes(term)) ? 40 : 0;
  const advancedPenalty = profile.experience !== "ADVANCED" && advancedTerms.some((term) => name.includes(term)) ? -60 : 0;
  const levelScore = exercise.level === "BEGINNER" ? 18 : exercise.level === "INTERMEDIATE" ? 10 : profile.experience === "ADVANCED" ? 8 : -8;
  const equipmentScore = exercise.equipment.some((item) => ["barra", "halteres", "maquina", "cabo", "peso corporal"].includes(item)) ? 10 : 0;
  return common + levelScore + equipmentScore + advancedPenalty;
}

function muscleExerciseScore(exercise: ExerciseSeed, muscle: string, profile: ProfileInput) {
  const name = normalizedName(exercise.name);
  const terms = simpleTermsByMuscle[muscle] ?? [];
  const termIndex = terms.findIndex((term) => name.includes(term));
  const termScore = termIndex >= 0 ? 120 - termIndex * 6 : 0;
  const primaryScore = exercise.primaryMuscles.includes(muscle) ? 90 : 0;
  const secondaryScore = exercise.secondaryMuscles.includes(muscle) ? 18 : 0;
  return primaryScore + secondaryScore + termScore + commonExerciseScore(exercise, profile);
}

function focusExerciseScore(exercise: ExerciseSeed, wanted: string[], profile: ProfileInput) {
  const primaryHits = exercise.primaryMuscles.filter((muscle) => wanted.includes(muscle)).length;
  const secondaryHits = exercise.secondaryMuscles.filter((muscle) => wanted.includes(muscle)).length;
  const bestMuscleScore = Math.max(...wanted.map((muscle) => muscleExerciseScore(exercise, muscle, profile)));
  return primaryHits * 85 + secondaryHits * 12 + bestMuscleScore;
}

// Escolhe aleatoriamente entre os melhores candidatos (mantém qualidade, varia a seleção).
function pickRandomTop<T>(items: T[], topN: number, rng: () => number): T | undefined {
  if (items.length === 0) return undefined;
  const n = Math.min(topN, items.length);
  return items[Math.floor(rng() * n)];
}

// Regras ESTRITAS por metodologia: a seleção nunca foge do estilo escolhido.
// allowed = filtro duro de equipamento (com fallback se esvaziar o dia); preferred = empurra para o topo.
const methodologyAllowedEquipment: Record<string, string[]> = {
  CALISTHENICS: ["peso corporal"],
  KETTLEBELL: ["kettlebell", "peso corporal"],
};
const methodologyPreferredEquipment: Record<string, string[]> = {
  POWERLIFTING: ["barra"],
  FIVE_BY_FIVE: ["barra"],
};

function matchesEquipment(exercise: ExerciseSeed, allowed: string[]) {
  return exercise.equipment.some((item) => allowed.includes(item));
}

// Aplica o filtro duro da metodologia, mas só se sobrarem exercícios suficientes para montar o dia.
function applyMethodologyPool(pool: ExerciseSeed[], methodologyValue: string) {
  const allowed = methodologyAllowedEquipment[methodologyValue];
  if (!allowed) return pool;
  const filtered = pool.filter((exercise) => matchesEquipment(exercise, allowed));
  return filtered.length >= 4 ? filtered : pool;
}

// Bônus de ordenação para metodologias que pedem básicos com barra (powerlifting, 5x5).
function methodologyBonus(exercise: ExerciseSeed, methodologyValue: string) {
  const preferred = methodologyPreferredEquipment[methodologyValue];
  if (preferred && matchesEquipment(exercise, preferred)) return 60;
  return 0;
}

// Movimento-base do exercício (ignora a variação após a vírgula: "pegada aberta", etc.).
function baseMovement(name: string) {
  return normalizedName(name).split(",")[0].replace(/\s+/g, " ").trim();
}

function pickExercises(focus: string, profile: ProfileInput, exercises: ExerciseSeed[], rng: () => number, methodologyValue: string) {
  const wanted = focusMuscles[focus] ?? ["quadriceps", "peitoral", "dorsais", "core"];
  const limit = profile.sessionMinutes <= 45 ? 4 : 6;
  const bonus = (exercise: ExerciseSeed) => methodologyBonus(exercise, methodologyValue);
  const pool = applyMethodologyPool(exercises.filter((exercise) => isAllowed(exercise, profile)), methodologyValue)
    .sort((a, b) => commonExerciseScore(b, profile) + bonus(b) - (commonExerciseScore(a, profile) + bonus(a)) || a.name.localeCompare(b.name, "pt-BR"));
  const selected: ExerciseSeed[] = [];
  const usedBases = new Set<string>();
  // Não repete o mesmo movimento-base no mesmo treino (ex.: dois "supino reto com barra").
  const isFresh = (exercise: ExerciseSeed) =>
    !selected.some((item) => item.slug === exercise.slug) && !usedBases.has(baseMovement(exercise.name));
  const addSelected = (exercise: ExerciseSeed) => {
    selected.push(exercise);
    usedBases.add(baseMovement(exercise.name));
  };

  for (const muscle of wanted) {
    const candidates = pool
      .filter((exercise) => isFresh(exercise) && (exercise.primaryMuscles.includes(muscle) || exercise.secondaryMuscles.includes(muscle)))
      .sort((a, b) => muscleExerciseScore(b, muscle, profile) + bonus(b) - (muscleExerciseScore(a, muscle, profile) + bonus(a)) || a.name.localeCompare(b.name, "pt-BR"));
    const primaryCandidates = candidates.filter((exercise) => exercise.primaryMuscles.includes(muscle));
    // Sorteia entre os 3 melhores que de fato treinam o músculo-alvo.
    const found = pickRandomTop(primaryCandidates, 3, rng) ?? candidates[0];
    if (found) addSelected(found);
  }

  while (selected.length < limit) {
    let added = false;
    for (const muscle of wanted) {
      if (selected.length >= limit) break;
      const muscleCandidates = pool
        .filter((exercise) => isFresh(exercise) && exercise.primaryMuscles.includes(muscle))
        .sort((a, b) => muscleExerciseScore(b, muscle, profile) + bonus(b) - (muscleExerciseScore(a, muscle, profile) + bonus(a)) || a.name.localeCompare(b.name, "pt-BR"));
      const next = pickRandomTop(muscleCandidates, 3, rng);
      if (next) {
        addSelected(next);
        added = true;
      }
    }
    if (!added) break;
  }

  const focusPool = pool
    .filter((exercise) => exercise.primaryMuscles.some((muscle) => wanted.includes(muscle)) || exercise.secondaryMuscles.some((muscle) => wanted.includes(muscle)))
    .sort((a, b) => focusExerciseScore(b, wanted, profile) + bonus(b) - (focusExerciseScore(a, wanted, profile) + bonus(a)) || a.name.localeCompare(b.name, "pt-BR"));

  for (const exercise of focusPool) {
    if (selected.length >= limit) break;
    if (isFresh(exercise)) addSelected(exercise);
  }

  return selected.slice(0, limit);
}

function averageReps(reps: string) {
  const values = reps.match(/\d+/g)?.map(Number) ?? [10];
  return values.length > 1 ? (values[0] + values[1]) / 2 : values[0];
}

function tempoSeconds(tempo: string) {
  const values = tempo.match(/\d+/g)?.map(Number) ?? [2, 0, 1, 0];
  return values.reduce((sum, value) => sum + value, 0);
}

function exerciseMetrics(profile: ProfileInput, exercise: ExerciseSeed, prescription: ReturnType<typeof setPrescription>) {
  const reps = averageReps(prescription.reps);
  const tempoRepSeg = tempoSeconds(prescription.tempo);
  const activeMinutes = (prescription.sets * reps * tempoRepSeg) / 60;
  const restMinutes = (Math.max(prescription.sets - 1, 0) * prescription.restSeconds) / 60;
  const met = exercise.metDefault ?? 3.5;
  const restMet = 1.5;
  const estimatedGrossKcal = met * 3.5 * profile.weightKg / 200 * activeMinutes + restMet * 3.5 * profile.weightKg / 200 * restMinutes;
  const estimatedNetKcal = Math.max(met - 1, 0) * 3.5 * profile.weightKg / 200 * activeMinutes + Math.max(restMet - 1, 0) * 3.5 * profile.weightKg / 200 * restMinutes;

  return {
    met,
    activeMinutes: round(activeMinutes, 2),
    restMinutes: round(restMinutes, 2),
    estimatedGrossKcal: round(estimatedGrossKcal, 2),
    estimatedNetKcal: round(estimatedNetKcal, 2),
    volumeReps: round(prescription.sets * reps),
  };
}

function focusesFor(profile: ProfileInput, sessionsPerWeek: number) {
  const methodology = getTrainingMethodology(profile.trainingMethodology);
  if (methodology.value === "AUTO") return fallbackFocusByDays[sessionsPerWeek] ?? fallbackFocusByDays[4];

  const cycle = methodologyFocus[methodology.value] ?? fallbackFocusByDays[sessionsPerWeek] ?? fallbackFocusByDays[4];
  return Array.from({ length: sessionsPerWeek }, (_, index) => cycle[index % cycle.length]);
}

export function generateWorkoutPlan(profile: ProfileInput, exercises: ExerciseSeed[], rng: () => number = Math.random): GeneratedWorkoutPlan {
  const selectedDays = profile.trainingDays.length > 0 ? profile.trainingDays : [...trainingDays].slice(0, Math.min(Math.max(profile.availableDays, 2), 7));
  const sessionsPerWeek = Math.min(Math.max(selectedDays.length, 2), 7);
  const methodology = getTrainingMethodology(profile.trainingMethodology);
  const focuses = focusesFor(profile, sessionsPerWeek);
  const prescription = setPrescription(profile.objective, profile.experience);
  const weeklyVolumeByMuscle: Record<string, number> = {};

  const days: WorkoutDay[] = focuses.map((focus, index) => {
    const workoutExercises = pickExercises(focus, profile, exercises, rng, methodology.value).map((exercise) => {
      for (const muscle of exercise.primaryMuscles) {
        weeklyVolumeByMuscle[muscle] = (weeklyVolumeByMuscle[muscle] ?? 0) + prescription.sets;
      }

      return {
        exerciseSlug: exercise.slug,
        name: exercise.name,
        demoKind: exercise.demoKind,
        imageUrl: exercise.imageUrl,
        primaryMuscles: exercise.primaryMuscles,
        secondaryMuscles: exercise.secondaryMuscles,
        equipment: exercise.equipment,
        sets: prescription.sets,
        reps: prescription.reps,
        loadSuggestion: "Use carga que preserve a técnica e termine dentro do RIR indicado.",
        rir: prescription.rir,
        rpe: prescription.rpe,
        restSeconds: prescription.restSeconds,
        tempo: prescription.tempo,
        ...exerciseMetrics(profile, exercise, prescription),
        notes: "Interrompa a série se houver dor aguda ou perda clara de controle.",
        progression: "Quando completar o topo das repetições em todas as séries, aumente 2-10% na próxima sessão, respeitando técnica e recuperação.",
        substitutions: exercise.alternatives,
        instructions: exercise.instructions,
        commonErrors: exercise.commonErrors,
        breathing: exercise.breathing,
        rangeOfMotion: exercise.rangeOfMotion,
        care: exercise.care,
      };
    });

    return {
      day: selectedDays[index] ?? trainingDays[index],
      focus,
      warmup: ["5-8 min de cardio leve", "2 séries leves do primeiro exercício", "Ative core e escápulas antes das cargas principais"],
      mobility: ["Mobilidade de tornozelo/quadril ou ombro conforme o treino", "Amplitude confortável, sem dor"],
      exercises: workoutExercises,
      cooldown: ["Respiração nasal por 2 min", "Alongamento leve dos músculos trabalhados"],
    };
  });

  return {
    title: `Plano Sistema Fitness - ${objectiveTitle(profile.objective)}`,
    objective: profile.objective,
    methodology: methodology.value,
    methodologyLabel: methodology.label,
    weeks: 4,
    sessionsPerWeek,
    days,
    progressionRule: "Progrida carga, repetições ou controle apenas quando técnica, sono e recuperação estiverem adequados.",
    deloadRule: "A cada 4 semanas, reduza volume em 30-40% se houver queda de performance, dor persistente ou fadiga alta.",
    weeklyVolumeByMuscle,
  };
}
