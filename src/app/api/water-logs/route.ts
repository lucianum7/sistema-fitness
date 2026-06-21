import { NextRequest } from "next/server";
import { startOfDay } from "date-fns";
import { jsonOk, handleRouteError } from "@/lib/server/api";
import { requireApiActiveUser } from "@/lib/server/api-auth";
import { getPrisma } from "@/lib/server/db";
import { waterLogSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await requireApiActiveUser();
    const logs = await getPrisma().waterLog.findMany({
      where: { userId: user.id, loggedAt: { gte: startOfDay(new Date()) } },
      orderBy: { loggedAt: "desc" },
    });
    return jsonOk({ logs, totalMl: logs.reduce((sum, item) => sum + item.amountMl, 0) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiActiveUser();
    const input = waterLogSchema.parse(await request.json());
    const log = await getPrisma().waterLog.create({ data: { userId: user.id, amountMl: input.amountMl } });
    return jsonOk({ log });
  } catch (error) {
    return handleRouteError(error);
  }
}
