"use client";

import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import { RingChart, TrendLine } from "./charts";
import { Button, Card, Field, HelpTip, TextAreaField } from "./ui";
import { formatDate } from "@/lib/utils";

type Measurement = {
  id: string;
  date: string | Date;
  weightKg: number;
  waistCm?: number | null;
  hipCm?: number | null;
  chestCm?: number | null;
  armCm?: number | null;
  thighCm?: number | null;
  calfCm?: number | null;
  bodyFatPct?: number | null;
  notes?: string | null;
};

const measurementFields = [
  ["weightKg", "Peso (kg)"],
  ["waistCm", "Cintura (cm)"],
  ["hipCm", "Quadril (cm)"],
  ["chestCm", "Peito (cm)"],
  ["armCm", "Braço (cm)"],
  ["thighCm", "Coxa (cm)"],
  ["calfCm", "Panturrilha (cm)"],
  ["bodyFatPct", "Gordura (%)"],
] as const;

export function BodyTracker({ initialMeasurements }: { initialMeasurements: Measurement[] }) {
  const [measurements, setMeasurements] = useState(initialMeasurements);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ weightKg: "", waistCm: "", hipCm: "", chestCm: "", armCm: "", thighCm: "", calfCm: "", bodyFatPct: "", notes: "" });
  const latest = measurements.at(-1);
  const first = measurements.at(0);
  const weightDelta = useMemo(() => {
    if (!latest || !first) return null;
    return Math.round((latest.weightKg - first.weightKg) * 10) / 10;
  }, [first, latest]);
  const waistDelta = latest?.waistCm && first?.waistCm ? Math.round((latest.waistCm - first.waistCm) * 10) / 10 : null;
  const bodyFatDelta = latest?.bodyFatPct && first?.bodyFatPct ? Math.round((latest.bodyFatPct - first.bodyFatPct) * 10) / 10 : null;
  const weightTrendPct = first && weightDelta !== null ? Math.min(Math.abs(weightDelta) / Math.max(first.weightKg * 0.08, 1) * 100, 100) : 0;
  const waistTrendPct = first?.waistCm && waistDelta !== null ? Math.min(Math.abs(waistDelta) / Math.max(first.waistCm * 0.08, 1) * 100, 100) : 0;
  const bodyFatTrendPct = first?.bodyFatPct && bodyFatDelta !== null ? Math.min(Math.abs(bodyFatDelta) / Math.max(first.bodyFatPct * 0.18, 1) * 100, 100) : 0;

  async function saveMeasurement() {
    const payload = Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ""));
    const result = await fetch("/api/measurements", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).then((response) => response.json());
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMeasurements((current) => [...current, result.data.measurement]);
    setForm({ weightKg: "", waistCm: "", hipCm: "", chestCm: "", armCm: "", thighCm: "", calfCm: "", bodyFatPct: "", notes: "" });
    setMessage("Medidas salvas.");
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-3">
        <Card className="quiet-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--primary)]">Peso</p>
              <h2 className="mt-1 text-2xl font-black">{latest ? `${latest.weightKg} kg` : "-"}</h2>
            </div>
            <HelpTip content="Mostra a mudança de peso observada entre o primeiro e o último registro." />
          </div>
          <RingChart value={weightTrendPct} total={100} label={weightDelta !== null ? `${weightDelta > 0 ? "+" : ""}${weightDelta} kg` : "sem dados"} />
        </Card>
        <Card className="quiet-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--primary)]">Cintura</p>
              <h2 className="mt-1 text-2xl font-black">{latest?.waistCm ? `${latest.waistCm} cm` : "-"}</h2>
            </div>
            <HelpTip content="Ajuda a acompanhar recomposição corporal quando usado junto de peso, treino, sono e alimentação." />
          </div>
          <RingChart value={waistTrendPct} total={100} label={waistDelta !== null ? `${waistDelta > 0 ? "+" : ""}${waistDelta} cm` : "opcional"} />
        </Card>
        <Card className="quiet-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--primary)]">Gordura corporal</p>
              <h2 className="mt-1 text-2xl font-black">{latest?.bodyFatPct ? `${latest.bodyFatPct}%` : "-"}</h2>
            </div>
            <HelpTip content="Campo opcional. Uma balança de bioimpedância pode facilitar registros frequentes, mas use como tendência, não como medida absoluta." />
          </div>
          <RingChart value={bodyFatTrendPct} total={100} label={bodyFatDelta !== null ? `${bodyFatDelta > 0 ? "+" : ""}${bodyFatDelta}%` : "bioimpedância"} />
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Card>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--primary)]">Histórico corporal</p>
              <h2 className="text-2xl font-black">Peso</h2>
            </div>
            {weightDelta !== null ? <p className="text-sm text-[var(--muted)]">Variação no período: <strong>{weightDelta > 0 ? "+" : ""}{weightDelta} kg</strong></p> : null}
          </div>
          <TrendLine data={measurements.map((item) => ({ label: formatDate(item.date), weight: item.weightKg }))} dataKey="weight" />
        </Card>
        <Card>
          <h2 className="font-black">Tendências</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Acompanhe direção e consistência dos registros sem prometer resultados. Alterações podem refletir treino, alimentação, sono, retenção hídrica e rotina.
          </p>
          <div className="mt-5 grid gap-3 text-sm">
            <p className="flex justify-between border-b border-[var(--line)] pb-2"><span className="text-[var(--muted)]">Último peso</span><strong>{latest ? `${latest.weightKg} kg` : "-"}</strong></p>
            <p className="flex justify-between border-b border-[var(--line)] pb-2"><span className="text-[var(--muted)]">Cintura</span><strong>{latest?.waistCm ? `${latest.waistCm} cm` : "-"}</strong></p>
            <p className="flex justify-between"><span className="text-[var(--muted)]">Gordura corporal</span><strong>{latest?.bodyFatPct ? `${latest.bodyFatPct}%` : "-"}</strong></p>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.72fr]">
        <Card>
          <h2 className="flex items-center gap-2 font-black">
            Novo registro corporal
            <HelpTip content="Peso é obrigatório. Medidas e gordura corporal são opcionais, mas melhoram a leitura de tendência." />
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Considere usar uma balança de bioimpedância para registrar gordura corporal com mais frequência. Se não tiver, continue usando peso, cintura e observações.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {measurementFields.map(([key, label]) => (
              <Field key={key} label={label} type="number" value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} />
            ))}
            <TextAreaField className="md:col-span-2" label="Observações" hint="Opcional: anote dados de bioimpedância como massa muscular, gordura visceral, hidratação, ciclo, retenção ou contexto do dia." value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
          </div>
          <Button type="button" className="mt-5" onClick={() => void saveMeasurement()}>
            <Save size={18} /> Salvar medidas
          </Button>
        </Card>

        <Card>
          <h2 className="font-black">Comparação por período</h2>
          <div className="mt-5 grid gap-3 text-sm">
            {measurements.slice(-5).reverse().map((item) => (
              <div key={item.id} className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)]/60 p-4">
                <p className="font-bold">{formatDate(item.date)}</p>
                <p className="mt-1 text-[var(--muted)]">
                  {item.weightKg} kg{item.waistCm ? ` | cintura ${item.waistCm} cm` : ""}{item.bodyFatPct ? ` | gordura ${item.bodyFatPct}%` : ""}
                </p>
                {item.notes ? <p className="mt-2 text-xs text-[var(--muted)]">{item.notes}</p> : null}
              </div>
            ))}
          </div>
        </Card>
      </section>

      {message ? <p className="text-sm font-semibold text-[var(--primary)]">{message}</p> : null}
    </div>
  );
}
