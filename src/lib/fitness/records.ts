// Ranking pessoal de recordes e conquistas — o aluno compete consigo mesmo.
// Funções puras (sem Prisma) para ficarem testáveis.

export type SessionInput = {
  startedAt: Date;
  totalVolumeKg: number;
  sets: { reps: number; loadKg: number; exerciseName?: string | null }[];
};

export type MealLogInput = { date: Date; proteinG: number };

export type PersonalRecord = {
  key: string;
  label: string;
  value: string;
  detail: string;
  achieved: boolean;
};

export type Achievement = {
  key: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: string;
};

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

// Chave de semana ISO (segunda como início), formato "AAAA-Www".
function weekKey(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // 0 = segunda
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // quinta da semana
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function longestStreak(dayKeys: string[]) {
  const unique = [...new Set(dayKeys)].sort();
  let best = 0;
  let current = 0;
  let previous: number | null = null;
  for (const key of unique) {
    const time = new Date(`${key}T00:00:00Z`).getTime();
    const dayDiff = previous === null ? null : Math.round((time - previous) / (24 * 3600 * 1000));
    current = dayDiff === 1 ? current + 1 : 1;
    best = Math.max(best, current);
    previous = time;
  }
  return best;
}

export function computePersonalRecords(
  sessions: SessionInput[],
  mealLogs: MealLogInput[],
  proteinTargetG: number,
  sessionsPerWeek: number,
): { records: PersonalRecord[]; achievements: Achievement[] } {
  const allSets = sessions.flatMap((session) => session.sets.map((set) => ({ ...set, startedAt: session.startedAt })));

  // 1. Maior carga em uma série.
  const heaviest = allSets.reduce<(typeof allSets)[number] | null>((best, set) => (set.loadKg > (best?.loadKg ?? 0) ? set : best), null);
  // 2. Maior volume em uma sessão.
  const biggestVolume = sessions.reduce<SessionInput | null>((best, session) => (session.totalVolumeKg > (best?.totalVolumeKg ?? 0) ? session : best), null);
  // 3. Maior número de repetições em uma série.
  const mostReps = allSets.reduce<(typeof allSets)[number] | null>((best, set) => (set.reps > (best?.reps ?? 0) ? set : best), null);

  // 4. Maior frequência semanal (dias distintos treinados na mesma semana).
  const sessionDaysByWeek = new Map<string, Set<string>>();
  for (const session of sessions) {
    const wk = weekKey(session.startedAt);
    const set = sessionDaysByWeek.get(wk) ?? new Set<string>();
    set.add(dayKey(session.startedAt));
    sessionDaysByWeek.set(wk, set);
  }
  const bestFrequency = [...sessionDaysByWeek.values()].reduce((max, set) => Math.max(max, set.size), 0);

  // 5. Maior sequência de treinos (dias consecutivos com sessão).
  const bestStreak = longestStreak(sessions.map((session) => dayKey(session.startedAt)));

  // 6. Melhor semana de proteína (maior média diária de proteína / meta).
  const proteinByWeek = new Map<string, { total: number; days: Set<string> }>();
  for (const log of mealLogs) {
    const wk = weekKey(log.date);
    const entry = proteinByWeek.get(wk) ?? { total: 0, days: new Set<string>() };
    entry.total += log.proteinG;
    entry.days.add(dayKey(log.date));
    proteinByWeek.set(wk, entry);
  }
  let bestProteinPct = 0;
  let bestProteinWeek = "";
  for (const [wk, entry] of proteinByWeek) {
    const avgPerDay = entry.total / Math.max(entry.days.size, 1);
    const pct = proteinTargetG > 0 ? Math.round((avgPerDay / proteinTargetG) * 100) : 0;
    if (pct > bestProteinPct) {
      bestProteinPct = pct;
      bestProteinWeek = wk;
    }
  }

  // 7. Maior aderência semanal (dias treinados / meta de dias por semana).
  const weeklyTarget = Math.max(sessionsPerWeek, 1);
  let bestAdherence = 0;
  let bestAdherenceWeek = "";
  for (const [wk, set] of sessionDaysByWeek) {
    const pct = Math.min(Math.round((set.size / weeklyTarget) * 100), 100);
    if (pct > bestAdherence) {
      bestAdherence = pct;
      bestAdherenceWeek = wk;
    }
  }

  const records: PersonalRecord[] = [
    {
      key: "load",
      label: "Maior carga",
      value: heaviest ? `${Math.round(heaviest.loadKg)} kg` : "—",
      detail: heaviest ? `${heaviest.exerciseName ?? "Exercício"} • ${formatDate(heaviest.startedAt)}` : "Registre uma série para começar",
      achieved: Boolean(heaviest),
    },
    {
      key: "volume",
      label: "Maior volume (sessão)",
      value: biggestVolume ? `${Math.round(biggestVolume.totalVolumeKg).toLocaleString("pt-BR")} kg` : "—",
      detail: biggestVolume ? formatDate(biggestVolume.startedAt) : "Conclua um treino para registrar",
      achieved: Boolean(biggestVolume),
    },
    {
      key: "reps",
      label: "Mais repetições (série)",
      value: mostReps ? `${mostReps.reps} reps` : "—",
      detail: mostReps ? `${mostReps.exerciseName ?? "Exercício"} • ${formatDate(mostReps.startedAt)}` : "Registre uma série para começar",
      achieved: Boolean(mostReps),
    },
    {
      key: "frequency",
      label: "Maior frequência semanal",
      value: bestFrequency > 0 ? `${bestFrequency}x` : "—",
      detail: bestFrequency > 0 ? "Treinos na mesma semana" : "Treine para registrar",
      achieved: bestFrequency > 0,
    },
    {
      key: "streak",
      label: "Maior sequência",
      value: bestStreak > 0 ? `${bestStreak} ${bestStreak === 1 ? "dia" : "dias"}` : "—",
      detail: bestStreak > 0 ? "Dias consecutivos treinando" : "Comece sua sequência",
      achieved: bestStreak > 0,
    },
    {
      key: "protein",
      label: "Melhor semana de proteína",
      value: bestProteinPct > 0 ? `${bestProteinPct}%` : "—",
      detail: bestProteinPct > 0 ? `Da meta • ${bestProteinWeek.replace("-W", " sem. ")}` : "Registre refeições para medir",
      achieved: bestProteinPct > 0,
    },
    {
      key: "adherence",
      label: "Maior aderência",
      value: bestAdherence > 0 ? `${bestAdherence}%` : "—",
      detail: bestAdherence > 0 ? `Da meta semanal • ${bestAdherenceWeek.replace("-W", " sem. ")}` : "Siga o plano para registrar",
      achieved: bestAdherence > 0,
    },
  ];

  const totalSessions = sessions.length;
  const achievements: Achievement[] = [
    {
      key: "first-workout",
      title: "Primeiro treino",
      description: "Conclua e registre seu primeiro treino.",
      unlocked: totalSessions >= 1,
      progress: `${Math.min(totalSessions, 1)}/1`,
    },
    {
      key: "ten-workouts",
      title: "Constância de 10",
      description: "Registre 10 treinos.",
      unlocked: totalSessions >= 10,
      progress: `${Math.min(totalSessions, 10)}/10`,
    },
    {
      key: "twentyfive-workouts",
      title: "Veterano (25 treinos)",
      description: "Registre 25 treinos.",
      unlocked: totalSessions >= 25,
      progress: `${Math.min(totalSessions, 25)}/25`,
    },
    {
      key: "streak-7",
      title: "Semana perfeita",
      description: "Treine 7 dias seguidos.",
      unlocked: bestStreak >= 7,
      progress: `${Math.min(bestStreak, 7)}/7`,
    },
    {
      key: "volume-ton",
      title: "Uma tonelada",
      description: "Mova 1.000 kg de volume em uma sessão.",
      unlocked: (biggestVolume?.totalVolumeKg ?? 0) >= 1000,
      progress: `${Math.min(Math.round(biggestVolume?.totalVolumeKg ?? 0), 1000)}/1000 kg`,
    },
    {
      key: "protein-week",
      title: "Semana proteica",
      description: "Bata a meta de proteína em uma semana.",
      unlocked: bestProteinPct >= 100,
      progress: `${Math.min(bestProteinPct, 100)}/100%`,
    },
    {
      key: "full-week",
      title: "Plano cumprido",
      description: "Cumpra todos os dias planejados em uma semana.",
      unlocked: bestAdherence >= 100,
      progress: `${Math.min(bestAdherence, 100)}/100%`,
    },
  ];

  return { records, achievements };
}
