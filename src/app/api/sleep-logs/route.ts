import { NextRequest } from "next/server";
import { jsonOk, handleRouteError } from "@/lib/server/api";
import { requireApiActiveUser } from "@/lib/server/api-auth";
import { getPrisma } from "@/lib/server/db";
import { sleepLogSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await requireApiActiveUser();
    const logs = await getPrisma().sleepLog.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: 14,
    });
    return jsonOk({ logs });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiActiveUser();
    const input = sleepLogSchema.parse(await request.json());
    const log = await getPrisma().sleepLog.create({ data: { userId: user.id, ...input } });
    return jsonOk({ log });
  } catch (error) {
    return handleRouteError(error);
  }
}
