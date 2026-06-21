"use client";

import { useMemo, useState } from "react";
import { Check, Droplets, Moon, ShieldCheck, SunMedium } from "lucide-react";
import { Button, Card, Field, SelectField } from "./ui";

type Notification = { id: string; title: string; body: string; readAt?: string | Date | null };

export function WellnessPanel({
  waterTargetMl,
  initialWaterMl,
  notifications,
  recentSleepHours,
  weeklyHabitCount,
}: {
  waterTargetMl: number;
  initialWaterMl: number;
  notifications: Notification[];
  recentSleepHours: number;
  weeklyHabitCount: number;
}) {
  const [waterMl, setWaterMl] = useState(initialWaterMl);
  const [sleep, setSleep] = useState({ hours: String(recentSleepHours), quality: "4", notes: "" });
  const [habitMessage, setHabitMessage] = useState("");
  const [notificationList, setNotificationList] = useState(notifications);
  const waterPercent = Math.min(Math.round((waterMl / Math.max(waterTargetMl, 1)) * 100), 140);
  const recoveryScore = useMemo(() => {
    const sleepScore = Math.min(Number(sleep.hours) / 8, 1) * 45;
    const waterScore = Math.min(waterMl / Math.max(waterTargetMl, 1), 1) * 35;
    const qualityScore = (Number(sleep.quality) / 5) * 20;
    return Math.round(sleepScore + waterScore + qualityScore);
  }, [sleep, waterMl, waterTargetMl]);

  async function addWater(amountMl: number) {
    const result = await fetch("/api/water-logs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amountMl }),
    }).then((response) => response.json());
    if (result.ok) setWaterMl((current) => current + amountMl);
  }

  async function saveSleep() {
    const result = await fetch("/api/sleep-logs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hours: Number(sleep.hours), quality: Number(sleep.quality), notes: sleep.notes }),
    }).then((response) => response.json());
    setHabitMessage(result.ok ? "Sono registrado." : result.error);
  }

  async function markHabit(name: string) {
    const result = await fetch("/api/habit-logs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, done: true }),
    }).then((response) => response.json());
    setHabitMessage(result.ok ? `${name} registrado.` : result.error);
  }

  async function readNotification(id: string) {
    const result = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    }).then((response) => response.json());
    if (result.ok) setNotificationList((current) => current.map((item) => (item.id === id ? { ...item, readAt: new Date() } : item)));
  }

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="flex items-center gap-2 font-bold"><Droplets size={18} /> Hidratação</h2>
          <p className="mt-2 text-3xl font-black">{Math.round(waterMl / 100) / 10} L</p>
          <p className="text-sm text-[var(--muted)]">Meta: {Math.round(waterTargetMl / 100) / 10} L</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--line)]">
            <span className="block h-full rounded-full bg-[var(--primary)]" style={{ width: `${Math.min(waterPercent, 100)}%` }} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[250, 500, 750].map((amount) => (
              <Button key={amount} type="button" variant="secondary" onClick={() => void addWater(amount)}>
                +{amount}
              </Button>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 font-bold"><ShieldCheck size={18} /> Recuperação</h2>
          <p className="mt-2 text-3xl font-black">{recoveryScore}%</p>
          <p className="text-sm text-[var(--muted)]">Leitura baseada em sono, qualidade e hidratação do dia.</p>
          <div className="mt-4 grid gap-2 text-sm">
            <p className="flex justify-between"><span>Sono</span><strong>{sleep.hours} h</strong></p>
            <p className="flex justify-between"><span>Hábitos recentes</span><strong>{weeklyHabitCount}</strong></p>
          </div>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 font-bold"><SunMedium size={18} /> Foco da semana</h2>
          <div className="mt-4 grid gap-2">
            {["Mobilidade", "Caminhada leve", "Planejar refeições", "Dormir no horário"].map((habit) => (
              <Button key={habit} type="button" variant="secondary" onClick={() => void markHabit(habit)}>
                <Check size={16} /> {habit}
              </Button>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <h2 className="flex items-center gap-2 font-bold"><Moon size={18} /> Sono</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <Field label="Horas" type="number" step="0.1" value={sleep.hours} onChange={(event) => setSleep({ ...sleep, hours: event.target.value })} />
            <SelectField label="Qualidade" value={sleep.quality} onChange={(event) => setSleep({ ...sleep, quality: event.target.value })}>
              <option value="1">1 - ruim</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5 - ótima</option>
            </SelectField>
            <Button type="button" onClick={() => void saveSleep()}>Salvar sono</Button>
          </div>
          {habitMessage ? <p className="mt-3 text-sm font-semibold text-[var(--primary)]">{habitMessage}</p> : null}
        </Card>

        <Card>
          <h2 className="font-bold">Sinais recentes</h2>
          <div className="mt-4 grid gap-2">
            {notificationList.length === 0 ? <p className="text-sm text-[var(--muted)]">Nenhum aviso pendente.</p> : null}
            {notificationList.slice(0, 4).map((item) => (
              <div key={item.id} className="rounded-[8px] border border-[var(--line)] p-3 text-sm">
                <p className="font-bold">{item.title}</p>
                <p className="text-[var(--muted)]">{item.body}</p>
                {!item.readAt ? (
                  <button type="button" className="mt-2 text-sm font-semibold text-[var(--primary)]" onClick={() => void readNotification(item.id)}>
                    Marcar como lido
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
