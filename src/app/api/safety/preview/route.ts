import { NextRequest } from "next/server";
import { calculateTargets } from "@/lib/fitness/calculations";
import { screenHealth } from "@/lib/fitness/safety";
import { jsonOk, handleRouteError } from "@/lib/server/api";
import { profileSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const profile = profileSchema.parse(await request.json());
    return jsonOk({
      metrics: calculateTargets(profile),
      safety: screenHealth(profile),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
