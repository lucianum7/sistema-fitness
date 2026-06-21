import { startOfDay } from "date-fns";
import { WellnessPanel } from "@/components/wellness-panel";
import type { MacroTargets } from "@/lib/fitness/types";
import { requireActiveAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/db";

export default async function BemEstarPage() {
  const user = await requireActiveAccess();
  const prisma = getPrisma();
  const [waterLogs, notifications, sleepLogs, habits] = await Promise.all([
    prisma.waterLog.findMany({ where: { userId: user.id, loggedAt: { gte: startOfDay(new Date()) } } }),
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.sleepLog.findMany({ where: { userId: user.id }, orderBy: { date: "desc" }, take: 7 }),
    prisma.habitLog.findMany({ where: { userId: user.id }, orderBy: { date: "desc" }, take: 20 }),
  ]);
  const targets = (user.profile?.targets ?? {}) as MacroTargets;

  return (
    <div className="grid gap-5">
      <header>
        <p className="text-sm font-semibold text-[var(--primary)]">Hidratação, sono e hábitos</p>
        <h1 className="text-3xl font-black md:text-4xl">Rotina</h1>
      </header>
      <WellnessPanel
        waterTargetMl={targets.waterMl ?? 2500}
        initialWaterMl={waterLogs.reduce((sum, item) => sum + item.amountMl, 0)}
        notifications={notifications}
        recentSleepHours={sleepLogs[0]?.hours ?? user.profile?.sleepHours ?? 7}
        weeklyHabitCount={habits.filter((habit) => habit.done).length}
      />
    </div>
  );
}
