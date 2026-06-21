import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, handleRouteError } from "@/lib/server/api";
import { requireApiActiveUser } from "@/lib/server/api-auth";
import { getPrisma } from "@/lib/server/db";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  done: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiActiveUser();
    const input = schema.parse(await request.json());
    const habit = await getPrisma().habitLog.create({ data: { userId: user.id, ...input } });
    return jsonOk({ habit });
  } catch (error) {
    return handleRouteError(error);
  }
}
