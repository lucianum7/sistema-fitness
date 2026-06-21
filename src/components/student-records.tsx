import { Award, Lock, Medal, Trophy } from "lucide-react";
import type { Achievement, PersonalRecord } from "@/lib/fitness/records";
import { Card } from "./ui";

export function PersonalRecordsSection({ records, achievements }: { records: PersonalRecord[]; achievements: Achievement[] }) {
  const unlocked = achievements.filter((item) => item.unlocked).length;

  return (
    <div className="grid gap-5">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-black">
            <Trophy className="text-[var(--gold)]" size={20} /> Ranking pessoal de recordes
          </h2>
          <span className="text-sm text-[var(--muted)]">Você compete com você mesmo</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {records.map((record) => (
            <div
              key={record.key}
              className={`rounded-[8px] border p-4 transition ${
                record.achieved ? "border-[var(--primary)]/40 bg-[var(--primary)]/8" : "border-dashed border-[var(--line)] bg-[var(--surface-strong)]/40"
              }`}
            >
              <p className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--muted)]">
                <Medal size={14} className={record.achieved ? "text-[var(--gold)]" : "text-[var(--muted)]"} /> {record.label}
              </p>
              <p className="mt-2 text-2xl font-black">{record.value}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{record.detail}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-black">
            <Award className="text-[var(--primary)]" size={20} /> Conquistas
          </h2>
          <span className="text-sm font-bold text-[var(--primary)]">{unlocked}/{achievements.length} desbloqueadas</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {achievements.map((achievement) => (
            <div
              key={achievement.key}
              className={`relative grid gap-1 rounded-[8px] border p-4 transition ${
                achievement.unlocked
                  ? "border-[var(--gold)]/50 bg-[var(--gold)]/10 shadow-sm"
                  : "border-[var(--line)] bg-[var(--surface-strong)]/40 opacity-80"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 font-black">
                  {achievement.unlocked ? <Trophy size={16} className="text-[var(--gold)]" /> : <Lock size={16} className="text-[var(--muted)]" />}
                  {achievement.title}
                </p>
                {achievement.unlocked ? (
                  <span className="rounded-full bg-[var(--gold)] px-2 py-0.5 text-[10px] font-black uppercase text-white">Conquistado!</span>
                ) : (
                  <span className="text-[10px] font-bold uppercase text-[var(--muted)]">{achievement.progress}</span>
                )}
              </div>
              <p className="text-xs leading-5 text-[var(--muted)]">{achievement.description}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
