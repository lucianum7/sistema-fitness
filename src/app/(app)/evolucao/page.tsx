import { BodyTracker } from "@/components/body-tracker";
import { requireActiveAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/db";

export default async function EvolucaoPage() {
  const user = await requireActiveAccess();
  const prisma = getPrisma();
  const measurements = await prisma.bodyMeasurement.findMany({ where: { userId: user.id }, orderBy: { date: "asc" } });

  return (
    <div className="grid gap-5">
      <header>
        <p className="text-sm font-semibold text-[var(--primary)]">Acompanhamento corporal</p>
        <h1 className="text-3xl font-black md:text-4xl">Evolução</h1>
      </header>
      <BodyTracker initialMeasurements={measurements} />
    </div>
  );
}
