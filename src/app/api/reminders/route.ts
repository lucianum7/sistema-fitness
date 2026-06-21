import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, handleRouteError } from "@/lib/server/api";
import { requireApiActiveUser } from "@/lib/server/api-auth";
import { getPrisma } from "@/lib/server/db";

const schema = z.object({
  title: z.string().trim().min(2).max(120),
  channel: z.enum(["app", "email"]).default("app"),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiActiveUser();
    const input = schema.parse(await request.json());
    const reminder = await getPrisma().reminder.create({ data: { userId: user.id, ...input } });
    return jsonOk({ reminder });
  } catch (error) {
    return handleRouteError(error);
  }
}
