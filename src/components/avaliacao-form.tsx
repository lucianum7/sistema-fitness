"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { calculateTargets } from "@/lib/fitness/calculations";
import { screenHealth } from "@/lib/fitness/safety";
import { trainingDays as weekDays, trainingMethodologies } from "@/lib/fitness/training-options";
import type { ProfileInput } from "@/lib/fitness/types";
import { Button, Field, SelectField, TextAreaField } from "./ui";

type ApiResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string; details?: unknown };
type TrainingDay = ProfileInput["trainingDays"][number];
type TrainingRange = "mon-fri" | "mon-sat" | "mon-sun";

const toList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const trainingRangeDays: Record<TrainingRange, TrainingDay[]> = {
  "mon-fri": [...weekDays.slice(0, 5)],
  "mon-sat": [...weekDays.slice(0, 6)],
  "mon-sun": [...weekDays],
};

async function postJson<T>(url: string, payload: unknown): Promise<ApiResult<T>> {
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response.json();
}

const STEPS = ["Sobre você", "Treino", "Saúde e metas"];

export function AvaliacaoForm() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState({
    age: "",
    sex: "",
    heightCm: "",
    weightKg: "",
    bodyFatPct: "",
    waistCm: "",
    hipCm: "",
    chestCm: "",
    armCm: "",
    thighCm: "",
    calfCm: "",
    objective: "RECOMPOSITION",
    experience: "INTERMEDIATE",
    trainingRange: "mon-fri" as TrainingRange,
    trainingDays: ["Segunda", "Terça", "Quarta", "Quinta"] as TrainingDay[],
    trainingMethodology: "AUTO",
    sessionMinutes: "60",
    equipment: "academia completa, barra, halteres, máquina, cabo",
    routine: "",
    activityLevel: "MODERATE",
    sleepHours: "7",
    waterLiters: "2.4",
    foodPreferences: "",
    allergies: "",
    intolerances: "",
    restrictions: "",
    conditions: "",
    injuries: "",
    medications: "",
    limitations: "",
  });
  const [consents, setConsents] = useState({
    healthScreening: false,
    professionalGuidance: false,
    dataProcessing: false,
  });

  const essentialsReady =
    Number(profile.age) >= 12 &&
    Number(profile.heightCm) >= 120 &&
    Number(profile.weightKg) >= 35 &&
    (profile.sex === "MALE" || profile.sex === "FEMALE" || profile.sex === "OTHER" || profile.sex === "NOT_INFORMED");

  const profileInput = useMemo<ProfileInput>(
    () => ({
      age: Number(profile.age),
      sex: (profile.sex || "NOT_INFORMED") as ProfileInput["sex"],
      heightCm: Number(profile.heightCm),
      weightKg: Number(profile.weightKg),
      bodyFatPct: profile.bodyFatPct ? Number(profile.bodyFatPct) : null,
      waistCm: profile.waistCm ? Number(profile.waistCm) : null,
      hipCm: profile.hipCm ? Number(profile.hipCm) : null,
      chestCm: profile.chestCm ? Number(profile.chestCm) : null,
      armCm: profile.armCm ? Number(profile.armCm) : null,
      thighCm: profile.thighCm ? Number(profile.thighCm) : null,
      calfCm: profile.calfCm ? Number(profile.calfCm) : null,
      objective: profile.objective as ProfileInput["objective"],
      experience: profile.experience as ProfileInput["experience"],
      availableDays: profile.trainingDays.length,
      trainingDays: profile.trainingDays,
      trainingMethodology: profile.trainingMethodology as ProfileInput["trainingMethodology"],
      sessionMinutes: Number(profile.sessionMinutes),
      equipment: toList(profile.equipment),
      routine: profile.routine,
      activityLevel: profile.activityLevel as ProfileInput["activityLevel"],
      sleepHours: Number(profile.sleepHours),
      waterLiters: Number(profile.waterLiters),
      foodPreferences: toList(profile.foodPreferences),
      allergies: toList(profile.allergies),
      intolerances: toList(profile.intolerances),
      restrictions: toList(profile.restrictions),
      conditions: toList(profile.conditions),
      injuries: toList(profile.injuries),
      medications: toList(profile.medications),
      limitations: toList(profile.limitations),
    }),
    [profile],
  );

  const metrics = useMemo(() => (essentialsReady ? calculateTargets(profileInput) : null), [essentialsReady, profileInput]);
  const safety = useMemo(() => (essentialsReady ? screenHealth(profileInput) : null), [essentialsReady, profileInput]);
  const canSubmit =
    essentialsReady &&
    consents.healthScreening &&
    consents.dataProcessing &&
    (!safety?.requiresProfessionalReview || consents.professionalGuidance);

  const updateProfile = (key: keyof typeof profile, value: string) => setProfile((current) => ({ ...current, [key]: value }));
  const rangeDays = trainingRangeDays[profile.trainingRange];

  function updateTrainingRange(value: TrainingRange) {
    const days = trainingRangeDays[value];
    setProfile((current) => ({ ...current, trainingRange: value, trainingDays: days }));
  }

  function toggleTrainingDay(day: TrainingDay) {
    setProfile((current) => {
      const selected = current.trainingDays.includes(day);
      const trainingDays = selected
        ? current.trainingDays.filter((item) => item !== day)
        : [...current.trainingDays, day].sort((a, b) => weekDays.indexOf(a) - weekDays.indexOf(b));
      if (trainingDays.length < 2) return current;
      return { ...current, trainingDays };
    });
  }

  async function submit() {
    setLoading(true);
    setMessage("");
    const result = await postJson("/api/onboarding", { profile: profileInput, consents });
    if (!result.ok) {
      setLoading(false);
      setMessage(result.error);
      return;
    }
    // Recarrega para o painel: o perfil agora existe e o gate libera o acesso.
    window.location.assign("/painel");
  }

  return (
    <form
      className="grid gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (step < STEPS.length - 1) setStep((current) => current + 1);
        else void submit();
      }}
    >
      <ol className="flex gap-2" aria-label="Etapas da avaliação">
        {STEPS.map((label, index) => (
          <li key={label} className="flex-1">
            <span className="block h-2 rounded-full" style={{ background: index <= step ? "var(--primary)" : "var(--line)" }} />
            <span className={`mt-2 block text-xs font-semibold ${index === step ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}>{label}</span>
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Idade" type="number" min={12} max={90} value={profile.age} onChange={(event) => updateProfile("age", event.target.value)} placeholder="ex: 28" required />
          <SelectField label="Sexo" value={profile.sex} onChange={(event) => updateProfile("sex", event.target.value)} required>
            <option value="" disabled>Selecione</option>
            <option value="FEMALE">Feminino</option>
            <option value="MALE">Masculino</option>
            <option value="OTHER">Outro</option>
            <option value="NOT_INFORMED">Prefiro não informar</option>
          </SelectField>
          <Field label="Altura (cm)" type="number" min={120} max={230} value={profile.heightCm} onChange={(event) => updateProfile("heightCm", event.target.value)} placeholder="ex: 172" required />
          <Field label="Peso (kg)" type="number" min={35} max={280} step="0.1" value={profile.weightKg} onChange={(event) => updateProfile("weightKg", event.target.value)} placeholder="ex: 74" required />
          <Field label="Gordura corporal (%)" type="number" step="0.1" value={profile.bodyFatPct} onChange={(event) => updateProfile("bodyFatPct", event.target.value)} placeholder="opcional" hint="Se não souber, deixe em branco." />
        </div>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Objetivo" value={profile.objective} onChange={(event) => updateProfile("objective", event.target.value)}>
            <option value="HYPERTROPHY">Hipertrofia</option>
            <option value="STRENGTH">Força</option>
            <option value="ENDURANCE">Resistência</option>
            <option value="CONDITIONING">Condicionamento</option>
            <option value="FAT_LOSS">Emagrecimento</option>
            <option value="RECOMPOSITION">Recomposição</option>
            <option value="BEGINNER">Iniciante</option>
            <option value="RETURN_GRADUAL">Retorno gradual</option>
          </SelectField>
          <SelectField label="Experiência" value={profile.experience} onChange={(event) => updateProfile("experience", event.target.value)}>
            <option value="BEGINNER">Iniciante</option>
            <option value="INTERMEDIATE">Intermediário</option>
            <option value="ADVANCED">Avançado</option>
          </SelectField>
          <SelectField label="Metodologia de treino" value={profile.trainingMethodology} onChange={(event) => updateProfile("trainingMethodology", event.target.value)}>
            {trainingMethodologies.map((methodology) => (
              <option key={methodology.value} value={methodology.value}>
                {methodology.label}
              </option>
            ))}
          </SelectField>
          <SelectField label="Agenda de treino" value={profile.trainingRange} onChange={(event) => updateTrainingRange(event.target.value as TrainingRange)}>
            <option value="mon-fri">Segunda a sexta</option>
            <option value="mon-sat">Segunda a sábado</option>
            <option value="mon-sun">Segunda a domingo</option>
          </SelectField>
          <fieldset className="grid gap-3 rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)] p-4 sm:col-span-2">
            <legend className="px-1 text-sm font-semibold">Dias que vai treinar</legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {rangeDays.map((day) => {
                const active = profile.trainingDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleTrainingDay(day)}
                    className={`min-h-11 rounded-[8px] border px-3 text-sm font-semibold transition ${
                      active
                        ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                        : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[var(--muted)]">{profile.trainingDays.length} dias: {profile.trainingDays.join(", ")}</p>
          </fieldset>
          <Field label="Duração do treino (min)" type="number" min={25} max={120} value={profile.sessionMinutes} onChange={(event) => updateProfile("sessionMinutes", event.target.value)} />
          <SelectField label="Nível de atividade no dia a dia" value={profile.activityLevel} onChange={(event) => updateProfile("activityLevel", event.target.value)}>
            <option value="SEDENTARY">Sedentário — trabalho sentado</option>
            <option value="LIGHT">Leve — 1 a 3 treinos/semana</option>
            <option value="MODERATE">Moderado — 3 a 5 treinos/semana</option>
            <option value="VERY_ACTIVE">Muito ativo — 6 a 7 treinos ou trabalho físico</option>
          </SelectField>
          <Field label="Sono médio (h)" type="number" step="0.1" min={0} max={14} value={profile.sleepHours} onChange={(event) => updateProfile("sleepHours", event.target.value)} />
          <Field label="Água por dia (L)" type="number" step="0.1" min={0} max={10} value={profile.waterLiters} onChange={(event) => updateProfile("waterLiters", event.target.value)} />
          <TextAreaField label="Equipamentos disponíveis" value={profile.equipment} onChange={(event) => updateProfile("equipment", event.target.value)} hint="Separe por vírgula." />
          <TextAreaField label="Rotina (opcional)" value={profile.routine} onChange={(event) => updateProfile("routine", event.target.value)} placeholder="ex: trabalho sentado, caminho 20 min/dia" />
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-5">
          <details className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
            <summary className="cursor-pointer text-sm font-semibold">Medidas e preferências (opcional)</summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="Cintura (cm)" type="number" value={profile.waistCm} onChange={(event) => updateProfile("waistCm", event.target.value)} />
              <Field label="Quadril (cm)" type="number" value={profile.hipCm} onChange={(event) => updateProfile("hipCm", event.target.value)} />
              <Field label="Peito (cm)" type="number" value={profile.chestCm} onChange={(event) => updateProfile("chestCm", event.target.value)} />
              <Field label="Braço (cm)" type="number" value={profile.armCm} onChange={(event) => updateProfile("armCm", event.target.value)} />
              <Field label="Coxa (cm)" type="number" value={profile.thighCm} onChange={(event) => updateProfile("thighCm", event.target.value)} />
              <Field label="Panturrilha (cm)" type="number" value={profile.calfCm} onChange={(event) => updateProfile("calfCm", event.target.value)} />
              <TextAreaField label="Preferências alimentares" value={profile.foodPreferences} onChange={(event) => updateProfile("foodPreferences", event.target.value)} />
              <TextAreaField label="Alergias" value={profile.allergies} onChange={(event) => updateProfile("allergies", event.target.value)} />
              <TextAreaField label="Intolerâncias" value={profile.intolerances} onChange={(event) => updateProfile("intolerances", event.target.value)} />
              <TextAreaField label="Restrições alimentares" value={profile.restrictions} onChange={(event) => updateProfile("restrictions", event.target.value)} />
              <TextAreaField label="Doenças ou condições" value={profile.conditions} onChange={(event) => updateProfile("conditions", event.target.value)} />
              <TextAreaField label="Lesões" value={profile.injuries} onChange={(event) => updateProfile("injuries", event.target.value)} />
              <TextAreaField label="Medicamentos" value={profile.medications} onChange={(event) => updateProfile("medications", event.target.value)} />
              <TextAreaField label="Limitações" value={profile.limitations} onChange={(event) => updateProfile("limitations", event.target.value)} />
            </div>
          </details>

          {metrics ? (
            <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)] p-4">
              <h2 className="font-bold">Suas metas calculadas</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <p>IMC: <strong>{metrics.bmi}</strong></p>
                <p>TMB: <strong>{metrics.bmr} kcal</strong></p>
                <p>Gasto diário: <strong>{metrics.tdee} kcal</strong></p>
                <p>Calorias: <strong>{metrics.targets.calories} kcal</strong></p>
                <p>Proteínas: <strong>{metrics.targets.proteinG} g</strong></p>
                <p>Água: <strong>{Math.round(metrics.targets.waterMl / 100) / 10} L</strong></p>
              </div>
            </section>
          ) : (
            <p className="rounded-[8px] border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">
              Preencha idade, sexo, altura e peso (etapa “Sobre você”) para ver suas metas.
            </p>
          )}

          {safety ? (
            <section className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-1 text-[var(--gold)]" size={20} />
                <div>
                  <h2 className="font-bold">Triagem de segurança</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Nível {safety.level === "HIGH" ? "alto" : safety.level === "MODERATE" ? "moderado" : "baixo"}. {safety.guidance.join(" ")}
                  </p>
                  {safety.flags.length > 0 ? <p className="mt-2 text-sm text-[var(--danger)]">Pontos: {safety.flags.join(", ")}</p> : null}
                </div>
              </div>
            </section>
          ) : null}

          <div className="grid gap-3 text-sm">
            {[
              ["healthScreening", "Confirmo que as informações de saúde estão corretas."],
              ["dataProcessing", "Autorizo o tratamento dos dados para acompanhamento da rotina."],
              ["professionalGuidance", "Entendo que devo buscar orientação profissional quando houver risco, dor, doença, medicamento ou limitação."],
            ].map(([key, label]) => (
              <label key={key} className="flex items-start gap-3">
                <input
                  className="mt-1 size-4"
                  type="checkbox"
                  checked={consents[key as keyof typeof consents]}
                  onChange={(event) => setConsents((current) => ({ ...current, [key]: event.target.checked }))}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {message ? <p className="rounded-[8px] border border-[var(--danger)] p-3 text-sm text-[var(--danger)]">{message}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        {step > 0 ? (
          <Button type="button" variant="secondary" onClick={() => setStep((current) => current - 1)}>
            Voltar
          </Button>
        ) : null}
        <Button type="submit" disabled={loading || (step === STEPS.length - 1 && !canSubmit)}>
          {loading ? <Loader2 className="animate-spin" size={18} /> : null}
          {step < STEPS.length - 1 ? "Continuar" : "Gerar meus planos"}
        </Button>
      </div>
    </form>
  );
}
