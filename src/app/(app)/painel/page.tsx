import { redirect } from "next/navigation";
import { startOfDay, subDays } from "date-fns";
import { BodyMap } from "@/components/body-map";
import { MacroDonut, RingChart, TrendLine, VolumeBars } from "@/components/charts";
import { ConsistencyCalendar } from "@/components/consistency-calendar";
import { Card, LinkButton } from "@/components/ui";
import { PersonalRecordsSection } from "@/components/student-records";
import { computePersonalRecords, type MealLogInput, type SessionInput } from "@/lib/fitness/records";
import type { GeneratedNutritionPlan, GeneratedWorkoutPlan, MacroTargets } from "@/lib/fitness/types";
import { requireActiveAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/db";
import { formatDate, formatNumber } from "@/lib/utils";

function numberFromJson(value: unknown, key: string) {
  if (!value || typeof value !== "object") return 0;
  const number = (value as Record<string, unknown>)[key];
  return typeof number === "number" ? number : 0;
}

const objectiveLabels: Record<string, string> = {
  HYPERTROPHY: "Hipertrofia",
  STRENGTH: "Força",
  ENDURANCE: "Resistência",
  CONDITIONING: "Condicionamento",
  FAT_LOSS: "Perda de peso",
  RECOMPOSITION: "Recomposição",
  BEGINNER: "Iniciante",
  RETURN_GRADUAL: "Retorno gradual",
};

export default async function PainelPage() {
  const user = await requireActiveAccess();
  if (user.role === "ADMIN") redirect("/admin");
  const prisma = getPrisma();
  const today = startOfDay(new Date());
  const [workoutPlan, nutritionPlan, measurements, mealLogs, waterLogs, sleepLogs, sessions, recordSessions, proteinLogs] = await Promise.all([
    prisma.workoutPlan.findFirst({ where: { userId: user.id, status: { in: ["ACTIVE", "NEEDS_REVIEW"] } }, orderBy: { createdAt: "desc" } }),
    prisma.nutritionPlan.findFirst({ where: { userId: user.id, status: { in: ["ACTIVE", "NEEDS_REVIEW"] } }, orderBy: { createdAt: "desc" } }),
    prisma.bodyMeasurement.findMany({ where: { userId: user.id }, orderBy: { date: "asc" }, take: 12 }),
    prisma.mealLog.findMany({ where: { userId: user.id, date: { gte: today } } }),
    prisma.waterLog.findMany({ where: { userId: user.id, loggedAt: { gte: today } } }),
    prisma.sleepLog.findMany({ where: { userId: user.id }, orderBy: { date: "desc" }, take: 7 }),
    prisma.workoutSession.findMany({ where: { userId: user.id, startedAt: { gte: subDays(new Date(), 35) } }, orderBy: { startedAt: "desc" }, take: 40 }),
    // Histórico completo (até 1 ano) para o ranking pessoal de recordes.
    prisma.workoutSession.findMany({
      where: { userId: user.id, startedAt: { gte: subDays(new Date(), 365) } },
      orderBy: { startedAt: "desc" },
      take: 300,
      include: { sets: { select: { reps: true, loadKg: true, exercise: { select: { name: true } } } } },
    }),
    prisma.mealLog.findMany({ where: { userId: user.id, date: { gte: subDays(new Date(), 365) } }, select: { date: true, totals: true }, take: 1500 }),
  ]);

  const workout = workoutPlan?.data as GeneratedWorkoutPlan | undefined;
  const nutrition = nutritionPlan
    ? ({ targets: nutritionPlan.targets, meals: nutritionPlan.meals, alerts: nutritionPlan.alerts } as GeneratedNutritionPlan)
    : undefined;
  const targets = (user.profile?.targets ?? nutrition?.targets ?? {}) as MacroTargets;
  const dayIndex = workout ? new Date().getDay() % workout.days.length : 0;
  const todayWorkout = workout?.days[dayIndex];
  const caloriesConsumed = mealLogs.reduce((sum, log) => sum + numberFromJson(log.totals, "calories"), 0);
  const proteinConsumed = mealLogs.reduce((sum, log) => sum + numberFromJson(log.totals, "proteinG"), 0);
  const carbsConsumed = mealLogs.reduce((sum, log) => sum + numberFromJson(log.totals, "carbsG"), 0);
  const fatConsumed = mealLogs.reduce((sum, log) => sum + numberFromJson(log.totals, "fatG"), 0);
  const waterMl = waterLogs.reduce((sum, log) => sum + log.amountMl, 0);
  const consistencyDays = Array.from(
    new Set([
      ...sessions.map((item) => item.startedAt.toISOString().slice(0, 10)),
      ...mealLogs.map((item) => item.date.toISOString().slice(0, 10)),
      ...waterLogs.map((item) => item.loggedAt.toISOString().slice(0, 10)),
    ]),
  );
  const trainedMuscles = todayWorkout?.exercises.flatMap((exercise) => exercise.primaryMuscles) ?? [];
  const volume = workout?.weeklyVolumeByMuscle
    ? Object.entries(workout.weeklyVolumeByMuscle).map(([muscle, sets]) => ({ muscle, sets }))
    : [];

  const recordSessionInputs: SessionInput[] = recordSessions.map((session) => ({
    startedAt: session.startedAt,
    totalVolumeKg: session.totalVolumeKg,
    sets: session.sets.map((set) => ({ reps: set.reps, loadKg: set.loadKg, exerciseName: set.exercise?.name ?? null })),
  }));
  const proteinLogInputs: MealLogInput[] = proteinLogs.map((log) => ({ date: log.date, proteinG: numberFromJson(log.totals, "proteinG") }));
  const { records, achievements } = computePersonalRecords(
    recordSessionInputs,
    proteinLogInputs,
    targets.proteinG ?? 0,
    workout?.sessionsPerWeek ?? user.profile?.availableDays ?? 3,
  );

  return (
    <div className="grid gap-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--primary)]">Olá, {user.name}</p>
          <h1 className="text-3xl font-black md:text-4xl">Central do Aluno</h1>
        </div>
        <LinkButton href="/treinos">Abrir treino</LinkButton>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-sm text-[var(--muted)]">Treino do dia</p>
          <h2 className="mt-2 text-2xl font-bold">{todayWorkout?.focus ?? "Plano pendente"}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">{todayWorkout?.exercises.length ?? 0} exercícios</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Peso atual</p>
          <h2 className="mt-2 text-2xl font-bold">{measurements.at(-1)?.weightKg ?? user.profile?.weightKg ?? "-"} kg</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">{user.profile ? objectiveLabels[user.profile.objective] ?? user.profile.objective : "-"}</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Sequência</p>
          <h2 className="mt-2 text-2xl font-bold">{consistencyDays.length} dias</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Últimos 35 dias</p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--muted)]">Sono médio</p>
          <h2 className="mt-2 text-2xl font-bold">
            {sleepLogs.length ? formatNumber(sleepLogs.reduce((sum, item) => sum + item.hours, 0) / sleepLogs.length, { maximumFractionDigits: 1 }) : "-"} h
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Recuperação</p>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="font-bold">Calorias</h2>
          <RingChart value={caloriesConsumed} total={targets.calories ?? 1} label={`${Math.round(caloriesConsumed)} / ${targets.calories ?? 0} kcal`} />
        </Card>
        <Card>
          <h2 className="font-bold">Macros consumidos</h2>
          <MacroDonut
            data={[
              { name: "Proteínas", value: proteinConsumed },
              { name: "Carboidratos", value: carbsConsumed },
              { name: "Gorduras", value: fatConsumed },
            ]}
          />
        </Card>
        <Card>
          <h2 className="font-bold">Hidratação</h2>
          <RingChart value={waterMl} total={targets.waterMl ?? 2500} label={`${Math.round(waterMl / 100) / 10} L / ${Math.round((targets.waterMl ?? 2500) / 100) / 10} L`} />
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <h2 className="font-bold">Peso e medidas</h2>
          <TrendLine data={measurements.map((item) => ({ label: formatDate(item.date), weight: item.weightKg }))} dataKey="weight" />
        </Card>
        <Card>
          <h2 className="font-bold">Consistência</h2>
          <div className="mt-4">
            <ConsistencyCalendar activeDays={consistencyDays} />
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Card>
          <h2 className="font-bold">Volume semanal por músculo</h2>
          <VolumeBars data={volume} />
        </Card>
        <Card>
          <h2 className="font-bold">Mapa corporal</h2>
          <BodyMap trained={trainedMuscles} recovery={sessions.slice(0, 2).map((item) => item.workoutName)} />
        </Card>
      </section>

      <PersonalRecordsSection records={records} achievements={achievements} />
    </div>
  );
}
