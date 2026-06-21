"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Circle, Dumbbell, Layers3, Loader2, Mail, Maximize2, RefreshCw, Repeat2, Save, ShieldCheck, SlidersHorizontal, Target, Timer, Trophy, X, Zap } from "lucide-react";
import { ExerciseDemo } from "@/components/exercise-demo";
import { getTrainingMethodology, trainingDays, trainingMethodologies, type TrainingDay, type TrainingMethodology } from "@/lib/fitness/training-options";
import type { Experience, GeneratedWorkoutPlan, WorkoutDay, WorkoutExercise } from "@/lib/fitness/types";
import { Button, Badge, Card, SelectField } from "./ui";

type ExerciseIndex = Record<string, string>;
export type ExerciseCatalogItem = {
  id: string;
  slug: string;
  name: string;
  demoKind: string;
  imageUrl?: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  level: Experience;
  instructions: string[];
  commonErrors: string[];
  breathing: string;
  rangeOfMotion: string;
  care: string;
  alternatives: string[];
};

type WorkoutPlannerProps = {
  planId: string;
  plan: GeneratedWorkoutPlan;
  exerciseIndex: ExerciseIndex;
  exerciseCatalog: ExerciseCatalogItem[];
  initialTrainingDays: string[];
  initialMethodology: string;
  initialExperience: Experience;
};

const rangeOptions = [
  { label: "Segunda a sexta", days: trainingDays.slice(0, 5) },
  { label: "Segunda a sábado", days: trainingDays.slice(0, 6) },
  { label: "Segunda a domingo", days: trainingDays },
];

function normalizeDays(days: string[]) {
  const validDays = days.filter((day): day is TrainingDay => trainingDays.includes(day as TrainingDay));
  return validDays.length >= 2 ? validDays : [...trainingDays.slice(0, 4)];
}

const experienceOptions: { value: Experience; label: string; description: string }[] = [
  { value: "BEGINNER", label: "Inicial", description: "Exercícios simples, comuns e com baixa complexidade técnica." },
  { value: "INTERMEDIATE", label: "Intermediário", description: "Base clássica com progressões moderadas e variações controladas." },
  { value: "ADVANCED", label: "Avançado", description: "Mais variações, maior demanda técnica e progressões mais específicas." },
];

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function inputNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function sharedCount(first: string[], second: string[]) {
  const target = new Set(first.map(normalizeText));
  return second.filter((item) => target.has(normalizeText(item))).length;
}

function nameTokens(value: string) {
  const ignored = new Set(["com", "sem", "na", "no", "em", "de", "da", "do", "maquina", "máquina", "halter", "barra", "cabo", "polia"]);
  return normalizeText(value)
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length > 2 && !ignored.has(token));
}

function replacementScore(exercise: WorkoutExercise, candidate: ExerciseCatalogItem) {
  if (candidate.slug === exercise.exerciseSlug || normalizeText(candidate.name) === normalizeText(exercise.name)) return -1;
  const primaryOverlap = sharedCount(exercise.primaryMuscles, candidate.primaryMuscles);
  if (primaryOverlap === 0) return -1;
  const secondaryOverlap = sharedCount(exercise.secondaryMuscles, candidate.secondaryMuscles);
  const equipmentOverlap = sharedCount(exercise.equipment, candidate.equipment);
  const targetTokens = new Set(nameTokens(exercise.name));
  const tokenOverlap = nameTokens(candidate.name).filter((token) => targetTokens.has(token)).length;
  const listedAlternative = exercise.substitutions.some((name) => normalizeText(name) === normalizeText(candidate.name));
  return primaryOverlap * 50 + secondaryOverlap * 12 + equipmentOverlap * 4 + tokenOverlap * 10 + (listedAlternative ? 35 : 0);
}

export function WorkoutPlanner({ planId, plan, exerciseIndex, exerciseCatalog, initialTrainingDays, initialMethodology, initialExperience }: WorkoutPlannerProps) {
  const router = useRouter();
  const [dayIndex, setDayIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [localPlan, setLocalPlan] = useState(plan);
  const [selectedDays, setSelectedDays] = useState<TrainingDay[]>(() => normalizeDays(initialTrainingDays));
  const [trainingMethodology, setTrainingMethodology] = useState<TrainingMethodology>(() => getTrainingMethodology(initialMethodology).value);
  const [experience, setExperience] = useState<Experience>(initialExperience);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [startMuscle, setStartMuscle] = useState<string | null>(null);
  const [emailingFicha, setEmailingFicha] = useState(false);
  const [savingReplacementSlug, setSavingReplacementSlug] = useState("");
  const [preferenceMessage, setPreferenceMessage] = useState("");
  const methodology = useMemo(() => getTrainingMethodology(trainingMethodology), [trainingMethodology]);
  const canApplyPreferences = selectedDays.length >= 2 && selectedDays.length >= methodology.minDays;
  const safeDayIndex = Math.min(dayIndex, localPlan.days.length - 1);
  const day = localPlan.days[safeDayIndex];
  const dayStats = useMemo(() => {
    const exercises = day?.exercises ?? [];
    const muscles = [...new Set(exercises.flatMap((exercise) => exercise.primaryMuscles))];
    return {
      exercises: exercises.length,
      sets: exercises.reduce((sum, exercise) => sum + exercise.sets, 0),
      muscles,
      estimatedMinutes: Math.max(30, Math.round(exercises.reduce((sum, exercise) => sum + exercise.sets * 3.5, 8))),
    };
  }, [day]);

  // "Vamos começar com qual músculo?" — evita despejar o treino inteiro de uma vez.
  const dayMuscles = useMemo(() => {
    const seen: string[] = [];
    for (const exercise of day?.exercises ?? []) {
      for (const muscle of exercise.primaryMuscles) {
        if (!seen.includes(muscle)) seen.push(muscle);
      }
    }
    return seen;
  }, [day]);

  // Cada vez que troca o dia (ou regenera o plano), volta a perguntar por onde começar.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStartMuscle(null);
  }, [safeDayIndex, localPlan]);

  const visibleExercises =
    startMuscle && startMuscle !== "__all__"
      ? (day?.exercises ?? []).filter((exercise) => exercise.primaryMuscles.includes(startMuscle))
      : day?.exercises ?? [];

  function replacementOptions(exercise: WorkoutExercise) {
    return exerciseCatalog
      .map((candidate) => ({ candidate, score: replacementScore(exercise, candidate) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name, "pt-BR"))
      .slice(0, 14)
      .map((item) => item.candidate);
  }

  async function replaceExercise(exerciseSlug: string, replacementSlug: string) {
    const replacement = exerciseCatalog.find((item) => item.slug === replacementSlug);
    if (!replacement) return;

    const previousPlan = localPlan;
    setLocalPlan((current) => ({
      ...current,
      days: current.days.map((currentDay, index) =>
        index === safeDayIndex
          ? {
              ...currentDay,
              exercises: currentDay.exercises.map((exercise) =>
                exercise.exerciseSlug === exerciseSlug
                  ? {
                      ...exercise,
                      exerciseSlug: replacement.slug,
                      name: replacement.name,
                      demoKind: replacement.demoKind,
                      imageUrl: replacement.imageUrl,
                      primaryMuscles: replacement.primaryMuscles,
                      secondaryMuscles: replacement.secondaryMuscles,
                      equipment: replacement.equipment,
                      substitutions: replacement.alternatives.length > 0 ? replacement.alternatives : exercise.substitutions,
                      instructions: replacement.instructions.length > 0 ? replacement.instructions : exercise.instructions,
                      commonErrors: replacement.commonErrors.length > 0 ? replacement.commonErrors : exercise.commonErrors,
                      breathing: replacement.breathing || exercise.breathing,
                      rangeOfMotion: replacement.rangeOfMotion || exercise.rangeOfMotion,
                      care: replacement.care || exercise.care,
                    }
                  : exercise,
              ),
            }
          : currentDay,
      ),
    }));

    setSavingReplacementSlug(exerciseSlug);
    const result = await fetch("/api/workouts/replace-exercise", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ planId, dayIndex: safeDayIndex, exerciseSlug, replacementSlug }),
    }).then((response) => response.json());
    setSavingReplacementSlug("");

    if (!result.ok) {
      setLocalPlan(previousPlan);
      setPreferenceMessage(result.error ?? "Não foi possível trocar o exercício.");
      return;
    }

    setLocalPlan(result.data.plan);
    setPreferenceMessage(`Exercício trocado para ${replacement.name}. A ficha foi atualizada.`);
  }

  function toggleTrainingDay(dayName: TrainingDay) {
    setSelectedDays((current) => {
      const selected = current.includes(dayName);
      const nextDays = selected ? current.filter((dayItem) => dayItem !== dayName) : [...current, dayName].sort((a, b) => trainingDays.indexOf(a) - trainingDays.indexOf(b));
      return nextDays.length < 2 ? current : nextDays;
    });
  }

  async function applyPreferences() {
    if (!canApplyPreferences) {
      setPreferenceMessage(`Escolha pelo menos ${methodology.minDays} dias para ${methodology.label}.`);
      return;
    }

    setSavingPreferences(true);
    setPreferenceMessage("");
    const result = await fetch("/api/workouts/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trainingDays: selectedDays, trainingMethodology, experience }),
    }).then((response) => response.json());
    setSavingPreferences(false);

    if (!result.ok) {
      setPreferenceMessage(result.error ?? "Não foi possível gerar o treino.");
      return;
    }

    setPreferenceMessage("Treino gerado com base no perfil, dias escolhidos e banco de exercícios.");
    router.refresh();
  }

  if (!day) {
    return (
      <Card>
        <p className="text-sm text-[var(--muted)]">Nenhum treino disponível neste plano.</p>
      </Card>
    );
  }

  const statCards = [
    { icon: Dumbbell, value: `${dayStats.exercises}`, label: "exercícios no dia" },
    { icon: Activity, value: `${dayStats.sets}`, label: "séries planejadas" },
    { icon: Target, value: `${dayStats.muscles.length}`, label: "grupos musculares" },
    { icon: Timer, value: `${dayStats.estimatedMinutes} min`, label: "estimativa da sessão" },
  ];

  return (
    <div className="grid gap-5">
      <section className="relative overflow-hidden rounded-[8px] border border-[var(--line)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--surface),transparent_0%),color-mix(in_srgb,var(--surface-strong),transparent_18%))] shadow-[var(--shadow-soft)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--primary)] via-[var(--blue)] to-[var(--accent)]" />
        <div className="grid gap-6 p-5 md:p-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="gap-2 border-[var(--primary)]/35 bg-[var(--primary)]/10 text-[var(--primary)]"><Layers3 size={14} /> {plan.methodologyLabel ?? "Automático Sistema Fitness"}</Badge>
              <Badge className="gap-2"><CalendarDays size={14} /> {localPlan.sessionsPerWeek}x por semana</Badge>
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-normal md:text-4xl">Treino sob medida</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">{methodology.description}</p>

            <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map(({ icon: Icon, value, label }) => (
                <div key={label} className="min-h-24 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]/72 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-2xl font-black">{value}</p>
                      <p className="mt-1 text-xs font-bold uppercase text-[var(--muted)]">{label}</p>
                    </div>
                    <span className="inline-flex size-9 items-center justify-center rounded-[8px] bg-[var(--primary)]/12 text-[var(--primary)]">
                      <Icon size={17} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]/80 p-4 shadow-sm">
            <div>
              <p className="flex items-center gap-2 text-sm font-black"><SlidersHorizontal size={16} /> Gerar novo treino</p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Usa o banco de exercícios, nível, equipamentos, limitações e dias escolhidos.</p>
            </div>

            <div className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                {rangeOptions.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setSelectedDays([...option.days])}
                    className="min-h-9 rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)] px-3 text-xs font-bold transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {trainingDays.map((dayName) => {
                  const active = selectedDays.includes(dayName);
                  return (
                    <button
                      key={dayName}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleTrainingDay(dayName)}
                      className={`min-h-10 rounded-[8px] border px-2 text-sm font-black transition ${
                        active
                          ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm"
                          : "border-[var(--line)] bg-[var(--surface-strong)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {dayName.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <SelectField label="Metodologia" value={trainingMethodology} onChange={(event) => setTrainingMethodology(event.target.value as TrainingMethodology)}>
                {trainingMethodologies.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Nível" value={experience} onChange={(event) => setExperience(event.target.value as Experience)}>
                {experienceOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </SelectField>
            </div>

            <p className="text-xs leading-5 text-[var(--muted)]">
              {selectedDays.length} dias: {selectedDays.join(", ")}. {experienceOptions.find((item) => item.value === experience)?.description}
            </p>
            {!canApplyPreferences ? <p className="text-xs font-semibold text-[var(--danger)]">Essa metodologia pede no mínimo {methodology.minDays} dias.</p> : null}

            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" onClick={() => void applyPreferences()} disabled={savingPreferences || !canApplyPreferences}>
                {savingPreferences ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                Gerar treino
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={emailingFicha}
                onClick={async () => {
                  setEmailingFicha(true);
                  setPreferenceMessage("");
                  const result = await fetch("/api/exports/email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "ficha" }) }).then((response) => response.json());
                  setEmailingFicha(false);
                  setPreferenceMessage(result.ok ? `Ficha enviada para o seu e-mail (${result.data.to}).` : result.error ?? "Não foi possível enviar a ficha.");
                }}
              >
                {emailingFicha ? <Loader2 className="animate-spin" size={18} /> : <Mail size={18} />} Ficha por e-mail
              </Button>
            </div>
          </div>
          {preferenceMessage ? <p className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)] p-3 text-sm font-semibold text-[var(--primary)]">{preferenceMessage}</p> : null}
        </div>
      </section>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {localPlan.days.map((item, index) => (
          <button
            key={`${item.day}-${item.focus}`}
            type="button"
            onClick={() => setDayIndex(index)}
            className={`grid min-h-20 gap-1 rounded-[8px] border p-3 text-left transition ${
              index === safeDayIndex
                ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm"
                : "border-[var(--line)] bg-[var(--surface)]/82 text-[var(--foreground)] shadow-sm hover:border-[var(--primary)] hover:bg-[var(--surface-strong)]"
            }`}
          >
            <span className="text-xs font-bold uppercase opacity-80">{item.day}</span>
            <span className="line-clamp-1 font-black">{item.focus}</span>
            <span className="text-xs opacity-80">{item.exercises.length} exercícios</span>
          </button>
        ))}
      </div>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="grid gap-4">
          <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)]/88 p-4 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-black"><Target size={16} /> Vamos começar com qual músculo?</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Escolha o grupo para focar agora — os exercícios aparecem só do que você selecionar, sem despejar o treino inteiro.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {dayMuscles.map((muscle) => (
                <button
                  key={muscle}
                  type="button"
                  onClick={() => setStartMuscle(muscle)}
                  className={`min-h-9 rounded-[8px] border px-3 text-sm font-bold capitalize transition ${
                    startMuscle === muscle
                      ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm"
                      : "border-[var(--line)] bg-[var(--surface-strong)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                  }`}
                >
                  {muscle}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setStartMuscle("__all__")}
                className={`min-h-9 rounded-[8px] border px-3 text-sm font-bold transition ${
                  startMuscle === "__all__"
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm"
                    : "border-[var(--line)] bg-[var(--surface-strong)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                }`}
              >
                Ver todos
              </button>
            </div>
          </div>

          {startMuscle === null ? (
            <div className="grid place-items-center rounded-[8px] border border-dashed border-[var(--line)] bg-[var(--surface-strong)]/40 p-8 text-center">
              <Dumbbell className="mb-2 text-[var(--primary)]" size={28} />
              <p className="text-sm font-bold">Escolha um músculo acima para ver os exercícios.</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{day.exercises.length} exercícios neste dia • {dayMuscles.length} grupos.</p>
            </div>
          ) : null}

          {startMuscle !== null
            ? visibleExercises.map((exercise, exerciseIndexItem) => {
            const replacements = replacementOptions(exercise);
            return (
              <article key={exercise.exerciseSlug} className="overflow-hidden rounded-[8px] border border-[var(--line)] bg-[var(--surface)]/88 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--primary)]/55 hover:shadow-[var(--shadow-soft)]">
                <div className="grid gap-0 md:grid-cols-[150px_1fr]">
                  <div className="border-b border-[var(--line)] bg-[var(--surface-strong)]/50 p-3 md:border-b-0 md:border-r">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="inline-flex size-8 items-center justify-center rounded-[8px] bg-[var(--primary)] text-sm font-black text-white">{exerciseIndexItem + 1}</span>
                      <Badge>{exercise.sets} x {exercise.reps}</Badge>
                    </div>
                    <ExerciseDemo kind={exercise.name} imageUrl={exercise.imageUrl} className="h-28 md:h-32" />
                  </div>
                  <div className="p-4 md:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--primary)]"><Target size={14} /> {exercise.primaryMuscles.join(", ")}</p>
                        <h3 className="mt-1 break-words text-xl font-black">{exercise.name}</h3>
                      </div>
                    </div>

                    <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-5">
                      {[
                        ["RIR", exercise.rir],
                        ["RPE", exercise.rpe],
                        ["Descanso", `${exercise.restSeconds}s`],
                        ["Cadência", exercise.tempo],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)]/55 px-3 py-2">
                          <dt className="text-xs font-bold uppercase text-[var(--muted)]">{label}</dt>
                          <dd className="mt-1 font-black">{value}</dd>
                        </div>
                      ))}
                      <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)]/55 px-3 py-2 sm:col-span-2 xl:col-span-1">
                        <dt className="text-xs font-bold uppercase text-[var(--muted)]">Carga</dt>
                        <dd className="mt-1 text-sm font-semibold leading-5">{exercise.loadSuggestion}</dd>
                      </div>
                    </dl>

                    {replacements.length > 0 ? (
                      <label className="mt-4 grid gap-2 text-sm font-semibold md:max-w-xl">
                        <span className="flex items-center gap-2"><Repeat2 size={16} /> Trocar por exercício equivalente</span>
                        <select
                          className="min-h-10 w-full rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 outline-none transition focus:border-[var(--primary)]"
                          value=""
                          disabled={savingReplacementSlug === exercise.exerciseSlug}
                          onChange={(event) => {
                            if (event.target.value) void replaceExercise(exercise.exerciseSlug, event.target.value);
                          }}
                        >
                          <option value="">{savingReplacementSlug === exercise.exerciseSlug ? "Salvando troca..." : "Selecionar alternativa local"}</option>
                          {replacements.map((replacement) => (
                            <option key={replacement.slug} value={replacement.slug}>
                              {replacement.name} - {replacement.equipment.join(", ") || "equipamento livre"}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    <details className="mt-4 rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)]/45 p-3 text-sm">
                      <summary className="cursor-pointer font-bold">Execução, erros e cuidados</summary>
                      <div className="mt-3 grid gap-2 leading-6 text-[var(--muted)]">
                        <p>{exercise.instructions.join(" ")}</p>
                        <p><strong className="text-[var(--foreground)]">Erros comuns:</strong> {exercise.commonErrors.join(" ")}</p>
                        <p><strong className="text-[var(--foreground)]">Respiração:</strong> {exercise.breathing}</p>
                        <p><strong className="text-[var(--foreground)]">Amplitude:</strong> {exercise.rangeOfMotion}</p>
                        <p><strong className="text-[var(--foreground)]">Cuidados:</strong> {exercise.care}</p>
                        <p><strong className="text-[var(--foreground)]">Alternativas:</strong> {exercise.substitutions.join(", ")}</p>
                        {typeof exercise.activeMinutes === "number" ? (
                          <p><strong className="text-[var(--foreground)]">Estimativa:</strong> {exercise.activeMinutes} min ativos, {exercise.restMinutes} min de descanso e {exercise.volumeReps} repetições totais.</p>
                        ) : null}
                      </div>
                    </details>
                  </div>
                </div>
              </article>
            );
              })
            : null}
        </div>

        <aside className="grid h-max gap-4 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]/88 p-4 shadow-[var(--shadow-soft)] xl:sticky xl:top-6">
          <div>
            <p className="text-xs font-bold uppercase text-[var(--primary)]">{day.day}</p>
            <h2 className="mt-1 text-2xl font-black">{day.focus}</h2>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-[8px] bg-[var(--surface-strong)] p-3">
              <p className="font-black">{dayStats.exercises}</p>
              <p className="text-xs text-[var(--muted)]">Exercícios</p>
            </div>
            <div className="rounded-[8px] bg-[var(--surface-strong)] p-3">
              <p className="font-black">{dayStats.sets}</p>
              <p className="text-xs text-[var(--muted)]">Séries</p>
            </div>
            <div className="rounded-[8px] bg-[var(--surface-strong)] p-3">
              <p className="font-black">{dayStats.estimatedMinutes}</p>
              <p className="text-xs text-[var(--muted)]">Min</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {dayStats.muscles.slice(0, 6).map((muscle) => (
              <Badge key={muscle}>{muscle}</Badge>
            ))}
          </div>
          <div className="grid gap-4 text-sm">
            <div>
              <p className="flex items-center gap-2 font-bold"><Zap size={16} /> Aquecimento</p>
              <ul className="mt-2 grid gap-2 text-[var(--muted)]">
                {day.warmup.map((item) => (
                  <li key={item} className="rounded-[8px] bg-[var(--surface-strong)] px-3 py-2">{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="flex items-center gap-2 font-bold"><ShieldCheck size={16} /> Mobilidade</p>
              <ul className="mt-2 grid gap-2 text-[var(--muted)]">
                {day.mobility.map((item) => (
                  <li key={item} className="rounded-[8px] bg-[var(--surface-strong)] px-3 py-2">{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <Button type="button" className="w-full" onClick={() => setFullscreen(true)}>
            <Maximize2 size={18} /> Iniciar treino
          </Button>
        </aside>
      </section>

      {fullscreen ? (
        <WorkoutMode planId={planId} day={day} exerciseIndex={exerciseIndex} onClose={() => setFullscreen(false)} />
      ) : null}
    </div>
  );
}

function WorkoutMode({ planId, day, exerciseIndex, onClose }: { planId: string; day: WorkoutDay; exerciseIndex: ExerciseIndex; onClose: () => void }) {
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [completedSessionId, setCompletedSessionId] = useState<string | null>(null);
  const [sets, setSets] = useState(() =>
    day.exercises.flatMap((exercise) =>
      Array.from({ length: exercise.sets }, (_, index) => ({
        exerciseSlug: exercise.exerciseSlug,
        exerciseName: exercise.name,
        exerciseId: exerciseIndex[exercise.exerciseSlug],
        setIndex: index + 1,
        reps: 10,
        loadKg: 0,
        rir: 2,
        done: false,
      })),
    ),
  );
  const exerciseGroups = useMemo(
    () =>
      day.exercises.map((exercise) => ({
        exercise,
        sets: sets.filter((set) => set.exerciseSlug === exercise.exerciseSlug),
      })),
    [day.exercises, sets],
  );
  const safeExerciseIndex = Math.min(activeExerciseIndex, exerciseGroups.length - 1);
  const activeGroup = exerciseGroups[safeExerciseIndex] ?? exerciseGroups[0];
  const completedSets = sets.filter((set) => set.done).length;
  const registeredSets = completedSets > 0 ? sets.filter((set) => set.done) : sets;
  const totalVolume = useMemo(() => registeredSets.reduce((sum, set) => sum + set.reps * set.loadKg, 0), [registeredSets]);
  const totalReps = registeredSets.reduce((sum, set) => sum + set.reps, 0);
  const completedExercises = exerciseGroups.filter((group) => group.sets.some((set) => set.done)).length;
  const progress = sets.length > 0 ? Math.round((completedSets / sets.length) * 100) : 0;
  const averageLoad = totalReps > 0 ? totalVolume / totalReps : 0;

  useEffect(() => {
    const interval = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, []);

  function updateSet(exerciseSlug: string, setIndex: number, update: Partial<(typeof sets)[number]>) {
    setSets((current) =>
      current.map((item) => (item.exerciseSlug === exerciseSlug && item.setIndex === setIndex ? { ...item, ...update } : item)),
    );
  }

  async function save() {
    setSaving(true);
    setMessage("");
    const payloadSets = registeredSets.map((set) => ({
      exerciseId: set.exerciseId,
      setIndex: set.setIndex,
      reps: Math.max(1, Math.round(set.reps)),
      loadKg: Math.max(0, set.loadKg),
      rir: Math.max(0, Math.round(set.rir)),
    }));
    const result = await fetch("/api/workout-sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        planId,
        workoutName: day.focus,
        totalVolumeKg: totalVolume,
        notes: `Duração: ${formatDuration(seconds)}. Séries marcadas: ${completedSets}/${sets.length}.`,
        sets: payloadSets,
      }),
    }).then((response) => response.json());
    setSaving(false);

    if (!result.ok) {
      setMessage(result.error ?? "Não foi possível salvar o treino.");
      return;
    }

    setCompletedSessionId(result.data.session.id);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--background)] p-3 md:p-5">
      <div className="mx-auto grid max-w-6xl gap-4">
        <header className="sticky top-0 z-20 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]/95 p-3 shadow-sm backdrop-blur md:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase text-[var(--primary)]">{day.day}</p>
              <h2 className="mt-1 break-words text-2xl font-black">{day.focus}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge><Timer size={14} /> {formatDuration(seconds)}</Badge>
              <Badge><Dumbbell size={14} /> {completedSets}/{sets.length} séries</Badge>
              <button type="button" title="Fechar" aria-label="Fechar" onClick={onClose} className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-strong)]">
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-strong)]">
            <div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${progress}%` }} />
          </div>
        </header>

        <main className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="grid h-max gap-3 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3 lg:sticky lg:top-28">
            {exerciseGroups.map((group, index) => {
              const done = group.sets.filter((set) => set.done).length;
              const active = index === safeExerciseIndex;
              return (
                <button
                  key={group.exercise.exerciseSlug}
                  type="button"
                  onClick={() => setActiveExerciseIndex(index)}
                  className={`grid gap-1 rounded-[8px] border p-3 text-left transition ${
                    active ? "border-[var(--primary)] bg-[var(--primary)]/10" : "border-[var(--line)] bg-[var(--surface-strong)] hover:border-[var(--primary)]"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-bold">{group.exercise.name}</span>
                    {done === group.sets.length ? <CheckCircle2 className="text-[var(--primary)]" size={18} /> : <Circle className="text-[var(--muted)]" size={18} />}
                  </span>
                  <span className="text-xs text-[var(--muted)]">{group.exercise.primaryMuscles.join(", ")}</span>
                  <span className="text-xs font-semibold">{done}/{group.sets.length} séries</span>
                </button>
              );
            })}
          </aside>

          {activeGroup ? (
            <section className="grid min-w-0 gap-4">
              <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4 md:p-5">
                <div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
                  <ExerciseDemo kind={activeGroup.exercise.name} imageUrl={activeGroup.exercise.imageUrl} className="h-44" />
                  <div className="min-w-0">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--primary)]">Exercício {safeExerciseIndex + 1} de {exerciseGroups.length}</p>
                        <h3 className="mt-1 break-words text-3xl font-black">{activeGroup.exercise.name}</h3>
                        <p className="mt-1 text-sm text-[var(--muted)]">{activeGroup.exercise.primaryMuscles.join(", ")}</p>
                      </div>
                      <Badge>{activeGroup.exercise.sets} x {activeGroup.exercise.reps}</Badge>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
                      <p className="rounded-[8px] bg-[var(--surface-strong)] p-3"><strong>Descanso</strong><br />{activeGroup.exercise.restSeconds}s</p>
                      <p className="rounded-[8px] bg-[var(--surface-strong)] p-3"><strong>RIR</strong><br />{activeGroup.exercise.rir}</p>
                      <p className="rounded-[8px] bg-[var(--surface-strong)] p-3"><strong>RPE</strong><br />{activeGroup.exercise.rpe}</p>
                      <p className="rounded-[8px] bg-[var(--surface-strong)] p-3"><strong>Cadência</strong><br />{activeGroup.exercise.tempo}</p>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-[var(--muted)]">
                      <p><strong className="text-[var(--foreground)]">Execução:</strong> {activeGroup.exercise.instructions.slice(0, 2).join(" ")}</p>
                      <p><strong className="text-[var(--foreground)]">Respiração:</strong> {activeGroup.exercise.breathing}</p>
                      <p><strong className="text-[var(--foreground)]">Evite:</strong> {activeGroup.exercise.commonErrors.slice(0, 3).join(", ")}.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-3 md:p-4">
                <div className="grid gap-2">
                  {activeGroup.sets.map((set) => (
                    <div key={`${set.exerciseSlug}-${set.setIndex}`} className="grid gap-3 rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)] p-3 md:grid-cols-[44px_minmax(0,1fr)_100px_110px_90px] md:items-end">
                      <button
                        type="button"
                        aria-label={`Marcar série ${set.setIndex}`}
                        onClick={() => updateSet(set.exerciseSlug, set.setIndex, { done: !set.done })}
                        className="inline-flex size-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)]"
                      >
                        {set.done ? <CheckCircle2 className="text-[var(--primary)]" size={20} /> : <Circle className="text-[var(--muted)]" size={20} />}
                      </button>
                      <div>
                        <p className="font-bold">Série {set.setIndex}</p>
                        <p className="text-sm text-[var(--muted)]">{set.done ? "Concluída" : "Pendente"}</p>
                      </div>
                      <label className="grid gap-1 text-sm font-semibold">
                        Reps
                        <input className="min-h-10 w-full rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3" type="number" min={1} value={set.reps} onChange={(event) => updateSet(set.exerciseSlug, set.setIndex, { reps: Math.max(1, inputNumber(event.target.value, set.reps)) })} />
                      </label>
                      <label className="grid gap-1 text-sm font-semibold">
                        Carga kg
                        <input className="min-h-10 w-full rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3" type="number" min={0} value={set.loadKg} onChange={(event) => updateSet(set.exerciseSlug, set.setIndex, { loadKg: Math.max(0, inputNumber(event.target.value, set.loadKg)) })} />
                      </label>
                      <label className="grid gap-1 text-sm font-semibold">
                        RIR
                        <input className="min-h-10 w-full rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3" type="number" min={0} value={set.rir} onChange={(event) => updateSet(set.exerciseSlug, set.setIndex, { rir: Math.max(0, inputNumber(event.target.value, set.rir)) })} />
                      </label>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button type="button" variant="secondary" onClick={() => setActiveExerciseIndex((index) => Math.max(index - 1, 0))} disabled={safeExerciseIndex === 0}>
                    <ChevronLeft size={16} /> Anterior
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setActiveExerciseIndex((index) => Math.min(index + 1, exerciseGroups.length - 1))} disabled={safeExerciseIndex === exerciseGroups.length - 1}>
                    Próximo <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            </section>
          ) : null}
        </main>

        <footer className="sticky bottom-0 z-20 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]/95 p-3 shadow-sm backdrop-blur md:p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <div className="grid gap-2 text-sm sm:grid-cols-4">
              <p><strong>{Math.round(totalVolume)} kg</strong><br /><span className="text-[var(--muted)]">Volume</span></p>
              <p><strong>{totalReps}</strong><br /><span className="text-[var(--muted)]">Repetições</span></p>
              <p><strong>{completedExercises}/{exerciseGroups.length}</strong><br /><span className="text-[var(--muted)]">Exercícios</span></p>
              <p><strong>{formatDuration(seconds)}</strong><br /><span className="text-[var(--muted)]">Duração</span></p>
            </div>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Concluir treino
            </Button>
          </div>
          {message ? <p className="mt-2 text-sm font-semibold text-[var(--danger)]">{message}</p> : null}
        </footer>
      </div>

      {completedSessionId ? (
        <div className="fixed inset-0 z-30 grid place-items-center bg-[var(--background)]/80 p-4 backdrop-blur">
          <section className="w-full max-w-2xl rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-xl md:p-7">
            <div className="flex items-start gap-4">
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-[8px] bg-[var(--primary)] text-white">
                <Trophy size={26} />
              </span>
              <div>
                <p className="text-sm font-bold uppercase text-[var(--primary)]">Treino salvo no histórico</p>
                <h2 className="mt-1 text-3xl font-black">Parabéns, você concluiu!</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{day.day} - {day.focus}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-[8px] bg-[var(--surface-strong)] p-4">
                <p className="text-2xl font-black">{formatDuration(seconds)}</p>
                <p className="text-sm text-[var(--muted)]">Duração</p>
              </div>
              <div className="rounded-[8px] bg-[var(--surface-strong)] p-4">
                <p className="text-2xl font-black">{Math.round(totalVolume)} kg</p>
                <p className="text-sm text-[var(--muted)]">Volume total</p>
              </div>
              <div className="rounded-[8px] bg-[var(--surface-strong)] p-4">
                <p className="text-2xl font-black">{registeredSets.length}</p>
                <p className="text-sm text-[var(--muted)]">Séries registradas</p>
              </div>
              <div className="rounded-[8px] bg-[var(--surface-strong)] p-4">
                <p className="text-2xl font-black">{averageLoad.toFixed(1)} kg</p>
                <p className="text-sm text-[var(--muted)]">Carga média</p>
              </div>
            </div>

            <div className="mt-5 rounded-[8px] border border-[var(--line)] p-4 text-sm">
              <p><strong>Exercícios concluídos:</strong> {completedExercises || exerciseGroups.length} de {exerciseGroups.length}</p>
              <p className="mt-2"><strong>Repetições registradas:</strong> {totalReps}</p>
              <p className="mt-2"><strong>ID do registro:</strong> {completedSessionId}</p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setCompletedSessionId(null)}>
                Continuar revisando
              </Button>
              <Button type="button" onClick={onClose}>
                Fechar treino
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
