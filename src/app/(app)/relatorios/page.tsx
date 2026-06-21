import { subDays } from "date-fns";
import { MacroDonut, RingChart, TrendLine, VolumeBars } from "@/components/charts";
import { ReportsActions } from "@/components/reports-actions";
import { Card } from "@/components/ui";
import type { GeneratedWorkoutPlan, MacroTargets, Meal } from "@/lib/fitness/types";
import { requireActiveAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/db";

function pct(value: number, total: number) {
  return Math.min(Math.round((value / Math.max(total, 1)) * 100), 100);
}

export default async function RelatoriosPage() {
  const user = await requireActiveAccess();
  const prisma = getPrisma();
  const since = subDays(new Date(), 30);
  const [workoutSessions, measurements, meals, waterLogs, sleepLogs, habits, workoutPlan, nutritionPlan] = await Promise.all([
    prisma.workoutSession.findMany({ where: { userId: user.id, startedAt: { gte: since } }, orderBy: { startedAt: "asc" } }),
    prisma.bodyMeasurement.findMany({ where: { userId: user.id }, orderBy: { date: "asc" }, take: 12 }),
    prisma.mealLog.findMany({ where: { userId: user.id, date: { gte: since } }, orderBy: { date: "desc" } }),
    prisma.waterLog.findMany({ where: { userId: user.id, loggedAt: { gte: since } } }),
    prisma.sleepLog.findMany({ where: { userId: user.id, date: { gte: since } }, orderBy: { date: "desc" } }),
    prisma.habitLog.findMany({ where: { userId: user.id, date: { gte: since } } }),
    prisma.workoutPlan.findFirst({ where: { userId: user.id, status: { in: ["ACTIVE", "NEEDS_REVIEW"] } }, orderBy: { createdAt: "desc" } }),
    prisma.nutritionPlan.findFirst({ where: { userId: user.id, status: { in: ["ACTIVE", "NEEDS_REVIEW"] } }, orderBy: { createdAt: "desc" } }),
  ]);

  const activeWorkout = workoutPlan?.data as unknown as GeneratedWorkoutPlan | undefined;
  const targets = (nutritionPlan?.targets ?? user.profile?.targets ?? {}) as MacroTargets;
  const plannedMeals = (nutritionPlan?.meals ?? []) as unknown as Meal[];
  const weeklyWorkoutGoal = (activeWorkout?.sessionsPerWeek ?? user.profile?.availableDays ?? 4) * 4;
  const workoutAdherence = pct(workoutSessions.length, weeklyWorkoutGoal);
  const mealGoal = 30 * 3;
  const mealAdherence = pct(meals.length, mealGoal);
  const waterTotalMl = waterLogs.reduce((sum, item) => sum + item.amountMl, 0);
  const waterGoalMl = (targets.waterMl ?? 2500) * 30;
  const waterAdherence = pct(waterTotalMl, waterGoalMl);
  const sleepAverage = sleepLogs.length ? sleepLogs.reduce((sum, item) => sum + item.hours, 0) / sleepLogs.length : user.profile?.sleepHours ?? 0;
  const habitDone = habits.filter((item) => item.done).length;
  const latestWeight = measurements.at(-1)?.weightKg;
  const firstWeight = measurements[0]?.weightKg;
  const weightDelta = latestWeight && firstWeight ? Math.round((latestWeight - firstWeight) * 10) / 10 : 0;
  const macroData = [
    { name: "Proteínas", value: targets.proteinG ?? 0 },
    { name: "Carboidratos", value: targets.carbsG ?? 0 },
    { name: "Gorduras", value: targets.fatG ?? 0 },
  ];
  const weightData = measurements.map((item) => ({ label: item.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), peso: item.weightKg }));
  const volumeData = activeWorkout
    ? Object.entries(activeWorkout.weeklyVolumeByMuscle).slice(0, 8).map(([muscle, sets]) => ({ muscle, sets }))
    : [];
  const plannedCalories = plannedMeals.reduce((sum, meal) => sum + meal.totals.calories, 0);

  return (
    <div className="grid gap-5">
      <header>
        <p className="text-sm font-semibold text-[var(--primary)]">Histórico, adesão e documentos</p>
        <h1 className="text-3xl font-black md:text-4xl">Relatórios</h1>
      </header>
      <ReportsActions />

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <h2 className="font-bold">Treino</h2>
          <RingChart value={workoutSessions.length} total={weeklyWorkoutGoal} label={`${workoutSessions.length}/${weeklyWorkoutGoal} sessões`} />
          <p className="text-sm text-[var(--muted)]">Adesão estimada de {workoutAdherence}% nos últimos 30 dias.</p>
        </Card>
        <Card>
          <h2 className="font-bold">Nutrição</h2>
          <RingChart value={meals.length} total={mealGoal} label={`${meals.length}/${mealGoal} registros`} />
          <p className="text-sm text-[var(--muted)]">Registros ajudam a entender consistência, sem julgamento rígido.</p>
        </Card>
        <Card>
          <h2 className="font-bold">Hidratação</h2>
          <RingChart value={waterTotalMl} total={waterGoalMl} label={`${Math.round(waterTotalMl / 100) / 10} L`} />
          <p className="text-sm text-[var(--muted)]">Meta acompanhada contra o alvo diário calculado.</p>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <h2 className="font-bold">Tendência corporal</h2>
          {weightData.length > 1 ? <TrendLine data={weightData} dataKey="peso" /> : <p className="mt-3 text-sm text-[var(--muted)]">Registre mais medidas para formar tendência.</p>}
          <p className="mt-2 text-sm text-[var(--muted)]">Variação no período registrado: {weightDelta > 0 ? "+" : ""}{weightDelta} kg.</p>
        </Card>
        <Card>
          <h2 className="font-bold">Macros planejados</h2>
          <MacroDonut data={macroData} />
          <p className="text-sm text-[var(--muted)]">{plannedCalories} kcal planejadas no cardápio ativo.</p>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Card>
          <h2 className="font-bold">Volume semanal por músculo</h2>
          {volumeData.length > 0 ? <VolumeBars data={volumeData} /> : <p className="mt-3 text-sm text-[var(--muted)]">Gere um treino para visualizar volume por músculo.</p>}
        </Card>
        <Card>
          <h2 className="font-bold">Leitura do mês</h2>
          <div className="mt-4 grid gap-3 text-sm leading-6 text-[var(--muted)]">
            <p><strong className="text-[var(--foreground)]">Sono:</strong> média de {Math.round(sleepAverage * 10) / 10} h por registro.</p>
            <p><strong className="text-[var(--foreground)]">Hábitos:</strong> {habitDone} marcações concluídas nos últimos 30 dias.</p>
            <p><strong className="text-[var(--foreground)]">Nutrição:</strong> {mealAdherence}% da frequência esperada de registros.</p>
            <p><strong className="text-[var(--foreground)]">Água:</strong> {waterAdherence}% da meta estimada no período.</p>
            <p><strong className="text-[var(--foreground)]">Treino:</strong> {activeWorkout?.methodologyLabel ?? "Plano ativo"} com {activeWorkout?.sessionsPerWeek ?? 0} sessões semanais.</p>
            <p>Os relatórios mostram tendências e adesão para revisão; eles não prometem resultado.</p>
          </div>
        </Card>
      </section>
    </div>
  );
}
