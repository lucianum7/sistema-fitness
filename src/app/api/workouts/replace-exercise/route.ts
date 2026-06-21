import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import type { GeneratedWorkoutPlan, WorkoutExercise } from "@/lib/fitness/types";
import { auditLog } from "@/lib/server/audit";
import { ApiError, handleRouteError, jsonOk } from "@/lib/server/api";
import { requireApiActiveUser } from "@/lib/server/api-auth";
import { getPrisma } from "@/lib/server/db";
import { workoutExerciseReplacementSchema } from "@/lib/validation";

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function hasMuscleOverlap(current: WorkoutExercise, replacement: { primaryMuscles: string[]; name: string }) {
  const target = new Set(current.primaryMuscles.map(normalizeText));
  const primaryOverlap = replacement.primaryMuscles.some((muscle) => target.has(normalizeText(muscle)));
  const listedAlternative = current.substitutions.some((name) => normalizeText(name) === normalizeText(replacement.name));
  return primaryOverlap || listedAlternative;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiActiveUser();
    const input = workoutExerciseReplacementSchema.parse(await request.json());
    const prisma = getPrisma();
    const [planRecord, replacement] = await Promise.all([
      prisma.workoutPlan.findFirst({
        where: {
          id: input.planId,
          userId: user.id,
          status: { in: ["ACTIVE", "NEEDS_REVIEW"] },
        },
      }),
      prisma.exercise.findUnique({
        where: { slug: input.replacementSlug },
        select: {
          slug: true,
          name: true,
          demoKind: true,
          imageUrl: true,
          primaryMuscles: true,
          secondaryMuscles: true,
          equipment: true,
          instructions: true,
          commonErrors: true,
          breathing: true,
          rangeOfMotion: true,
          care: true,
          alternatives: true,
        },
      }),
    ]);

    if (!planRecord) throw new ApiError("Ficha de treino nao encontrada.", 404);
    if (!replacement) throw new ApiError("Exercicio substituto nao encontrado.", 404);

    const plan = planRecord.data as unknown as GeneratedWorkoutPlan;
    const day = plan.days[input.dayIndex];
    if (!day) throw new ApiError("Dia de treino nao encontrado.", 404);

    const currentExercise = day.exercises.find((exercise) => exercise.exerciseSlug === input.exerciseSlug);
    if (!currentExercise) throw new ApiError("Exercicio original nao encontrado nesta ficha.", 404);
    if (!hasMuscleOverlap(currentExercise, replacement)) {
      throw new ApiError("Escolha uma alternativa com o mesmo musculo principal do exercicio atual.", 422);
    }

    const nextPlan: GeneratedWorkoutPlan = {
      ...plan,
      days: plan.days.map((currentDay, index) =>
        index === input.dayIndex
          ? {
              ...currentDay,
              exercises: currentDay.exercises.map((exercise) =>
                exercise.exerciseSlug === input.exerciseSlug
                  ? {
                      ...exercise,
                      exerciseSlug: replacement.slug,
                      name: replacement.name,
                      demoKind: replacement.demoKind,
                      imageUrl: replacement.imageUrl,
                      primaryMuscles: replacement.primaryMuscles,
                      secondaryMuscles: replacement.secondaryMuscles,
                      equipment: replacement.equipment,
                      substitutions: stringArray(replacement.alternatives).length > 0 ? stringArray(replacement.alternatives) : exercise.substitutions,
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
    };

    const savedPlan = await prisma.workoutPlan.update({
      where: { id: planRecord.id },
      data: { data: nextPlan as unknown as Prisma.InputJsonValue },
    });

    await auditLog({
      userId: user.id,
      action: "workout.exercise_replaced",
      entity: "workoutPlan",
      entityId: savedPlan.id,
      metadata: {
        day: day.day,
        from: currentExercise.exerciseSlug,
        to: replacement.slug,
      },
    });

    return jsonOk({ plan: nextPlan });
  } catch (error) {
    return handleRouteError(error);
  }
}
