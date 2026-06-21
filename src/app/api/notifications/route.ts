import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, handleRouteError } from "@/lib/server/api";
import { requireApiUser } from "@/lib/server/api-auth";
import { getPrisma } from "@/lib/server/db";

const schema = z.object({ id: z.string().min(1) });

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireApiUser();
    const input = schema.parse(await request.json());
    const notification = await getPrisma().notification.update({
      where: { id: input.id, userId: user.id },
      data: { readAt: new Date() },
    });
    return jsonOk({ notification });
  } catch (error) {
    return handleRouteError(error);
  }
}
