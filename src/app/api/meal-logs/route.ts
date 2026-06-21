import { NextRequest } from "next/server";
import { startOfDay } from "date-fns";
import { Prisma } from "@/generated/prisma/client";
import { jsonOk, handleRouteError } from "@/lib/server/api";
import { requireApiActiveUser } from "@/lib/server/api-auth";
import { getPrisma } from "@/lib/server/db";
import { mealLogSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await requireApiActiveUser();
    const logs = await getPrisma().mealLog.findMany({
      where: { userId: user.id, date: { gte: startOfDay(new Date()) } },
      orderBy: { date: "desc" },
    });
    return jsonOk({ logs });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiActiveUser();
    const input = mealLogSchema.parse(await request.json());
    const log = await getPrisma().mealLog.create({
      data: {
        userId: user.id,
        mealName: input.mealName,
        items: input.items as Prisma.InputJsonValue,
        totals: input.totals as Prisma.InputJsonValue,
      },
    });
    return jsonOk({ log });
  } catch (error) {
    return handleRouteError(error);
  }
}
