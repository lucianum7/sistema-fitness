import { subDays } from "date-fns";

export function ConsistencyCalendar({ activeDays }: { activeDays: string[] }) {
  const active = new Set(activeDays);
  const days = Array.from({ length: 35 }, (_, index) => subDays(new Date(), 34 - index));

  return (
    <div className="grid gap-3" aria-label="Calendário de consistência">
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, index) => {
          const key = day.toISOString().slice(0, 10);
          const done = active.has(key);
          const intensity = done ? 0.38 + (index % 4) * 0.12 : 0;
          return (
            <span
              key={key}
              title={day.toLocaleDateString("pt-BR")}
              className="aspect-square rounded-[6px] border transition hover:-translate-y-0.5"
              style={{
                background: done ? `color-mix(in srgb, var(--primary) ${Math.round(intensity * 100)}%, var(--surface-strong))` : "color-mix(in srgb, var(--surface-strong), transparent 8%)",
                borderColor: done ? "color-mix(in srgb, var(--primary), transparent 25%)" : "var(--line)",
                boxShadow: done ? "0 8px 18px color-mix(in srgb, var(--primary), transparent 78%)" : "none",
              }}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[var(--muted)]">
        <span>35 dias</span>
        <span>{activeDays.length} marcações</span>
      </div>
    </div>
  );
}
