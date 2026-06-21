import Image from "next/image";

type ZoneStatus = "trained" | "recovery" | null;

const muscleZones = [
  { key: "peitoral", label: "Peitoral", aliases: ["peitoral", "peito"], points: [[30.5, 27]] },
  { key: "deltoides", label: "Ombros", aliases: ["deltoides", "ombros", "ombro"], points: [[20.5, 25], [40.5, 25], [61, 25], [81.5, 25]] },
  { key: "biceps", label: "Bíceps", aliases: ["biceps", "bíceps", "bracos", "braços"], points: [[19, 35], [42, 35]] },
  { key: "triceps", label: "Tríceps", aliases: ["triceps", "tríceps", "bracos", "braços"], points: [[59, 35], [83, 35]] },
  { key: "core", label: "Core", aliases: ["core", "abdomen", "abdominal"], points: [[30.5, 41]] },
  { key: "dorsais", label: "Costas", aliases: ["dorsais", "costas", "romboides", "lombar"], points: [[71, 31]] },
  { key: "gluteos", label: "Glúteos", aliases: ["gluteos", "glúteos", "gluteo", "glúteo"], points: [[71, 51]] },
  { key: "quadriceps", label: "Quadríceps", aliases: ["quadriceps", "quadríceps", "pernas", "perna"], points: [[27, 61], [34, 61]] },
  { key: "posteriores", label: "Posteriores", aliases: ["posteriores", "posterior", "pernas", "perna"], points: [[68, 62], [74, 62]] },
  { key: "panturrilhas", label: "Panturrilhas", aliases: ["panturrilhas", "panturrilha"], points: [[28, 79], [33, 79], [68, 79], [74, 79]] },
] as const;

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function BodyMap({ trained = [], recovery = [] }: { trained?: string[]; recovery?: string[] }) {
  const trainedText = normalizeText(trained.join(" "));
  const recoveryText = normalizeText(recovery.join(" "));
  const zones = muscleZones.map((zone) => {
    const aliases = zone.aliases.map(normalizeText);
    const status: ZoneStatus = aliases.some((alias) => recoveryText.includes(alias))
      ? "recovery"
      : aliases.some((alias) => trainedText.includes(alias))
        ? "trained"
        : null;
    return { ...zone, status };
  });
  const activeZones = zones.filter((zone) => zone.status !== null);

  return (
    <div className="grid gap-4">
      <div
        className="relative aspect-[3/2] min-h-56 overflow-hidden rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)]/45"
        role="img"
        aria-label="Mapa anatômico frontal e posterior com músculos treinados e em recuperação"
      >
        <span className="absolute left-4 top-3 z-10 text-[10px] font-bold uppercase text-[var(--muted)]">Frente</span>
        <span className="absolute right-4 top-3 z-10 text-[10px] font-bold uppercase text-[var(--muted)]">Costas</span>
        <Image
          src="/body-map-anatomy.png"
          alt="Anatomia muscular vista de frente e de costas"
          fill
          sizes="(max-width: 768px) 100vw, 440px"
          className="object-contain p-2 drop-shadow-[0_12px_18px_rgba(0,0,0,0.18)]"
        />
        {activeZones.flatMap((zone) =>
          zone.points.map(([left, top], index) => (
            <span
              key={`${zone.key}-${index}`}
              title={`${zone.label}: ${zone.status === "recovery" ? "em recuperação" : "treinado"}`}
              className={`pulse-ring pointer-events-none absolute z-20 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_4px_color-mix(in_srgb,currentColor,transparent_76%)] ${
                zone.status === "recovery" ? "bg-[var(--gold)] text-[var(--gold)]" : "bg-[var(--primary)] text-[var(--primary)]"
              }`}
              style={{ left: `${left}%`, top: `${top}%` }}
            />
          )),
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-[var(--muted)]">
        <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-[var(--primary)]" /> Treinado</span>
        <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-[var(--gold)]" /> Recuperação</span>
      </div>

      <div className="flex min-h-7 flex-wrap gap-2">
        {activeZones.length > 0 ? activeZones.map((zone) => (
          <span key={zone.key} className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-2.5 py-1 text-xs font-semibold">
            {zone.label}
          </span>
        )) : <span className="text-xs text-[var(--muted)]">Nenhum grupo muscular registrado hoje.</span>}
      </div>
    </div>
  );
}
