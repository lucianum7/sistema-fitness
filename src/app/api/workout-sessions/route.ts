import { NextRequest } from "next/server";
import { jsonOk, handleRouteError } from "@/lib/server/api";
import { requireApiActiveUser } from "@/lib/server/api-auth";
import { getPrisma } from "@/lib/server/db";
import { workoutSessionSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiActiveUser();
    const input = workoutSessionSchema.parse(await request.json());
    const session = await getPrisma().workoutSession.create({
      data: {
        userId: user.id,
        planId: input.planId ?? null,
        workoutName: input.workoutName,
        perceivedEffort: input.perceivedEffort,
        totalVolumeKg: input.totalVolumeKg,
        notes: input.notes,
        finishedAt: new Date(),
        sets: {
          create: input.sets.map((set) => ({
            exerciseId: set.exerciseId ?? null,
            setIndex: set.setIndex,
            reps: set.reps,
            loadKg: set.loadKg,
            rir: set.rir,
            rpe: set.rpe,
            notes: set.notes,
          })),
        },
      },
      include: { sets: true },
    });
    return jsonOk({ session });
  } catch (error) {
    return handleRouteError(error);
  }
}
