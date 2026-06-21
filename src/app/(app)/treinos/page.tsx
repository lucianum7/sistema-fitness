import { WorkoutPlanner, type ExerciseCatalogItem } from "@/components/workout-planner";
import type { GeneratedWorkoutPlan } from "@/lib/fitness/types";
import { requireActiveAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/db";

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export default async function TreinosPage() {
  const user = await requireActiveAccess();
  const prisma = getPrisma();
  const [plan, exercises] = await Promise.all([
    prisma.workoutPlan.findFirst({ where: { userId: user.id, status: { in: ["ACTIVE", "NEEDS_REVIEW"] } }, orderBy: { createdAt: "desc" } }),
    prisma.exercise.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        demoKind: true,
        imageUrl: true,
        primaryMuscles: true,
        secondaryMuscles: true,
        equipment: true,
        level: true,
        instructions: true,
        commonErrors: true,
        breathing: true,
        rangeOfMotion: true,
        care: true,
        alternatives: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!plan) {
    return (
      <div className="soft-card rounded-[8px] p-6">
        <h1 className="text-3xl font-black">Treinos</h1>
        <p className="mt-2 text-[var(--muted)]">Nenhum plano ativo encontrado. Gere seus planos novamente no painel.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <header>
        <p className="text-sm font-semibold text-[var(--primary)]">Plano de {plan.weeks} semanas</p>
        <h1 className="text-3xl font-black md:text-4xl">{plan.title}</h1>
      </header>
      <WorkoutPlanner
        key={`${plan.id}-${plan.updatedAt.toISOString()}`}
        planId={plan.id}
        plan={plan.data as GeneratedWorkoutPlan}
        exerciseIndex={Object.fromEntries(exercises.map((exercise) => [exercise.slug, exercise.id]))}
        exerciseCatalog={exercises.map((exercise) => ({
          id: exercise.id,
          slug: exercise.slug,
          name: exercise.name,
          demoKind: exercise.demoKind,
          imageUrl: exercise.imageUrl,
          primaryMuscles: exercise.primaryMuscles,
          secondaryMuscles: exercise.secondaryMuscles,
          equipment: exercise.equipment,
          level: exercise.level,
          instructions: exercise.instructions,
          commonErrors: exercise.commonErrors,
          breathing: exercise.breathing,
          rangeOfMotion: exercise.rangeOfMotion,
          care: exercise.care,
          alternatives: stringArray(exercise.alternatives),
        } satisfies ExerciseCatalogItem))}
        initialTrainingDays={user.profile?.trainingDays ?? []}
        initialMethodology={user.profile?.trainingMethodology ?? "AUTO"}
        initialExperience={user.profile?.experience ?? "BEGINNER"}
      />
    </div>
  );
}
