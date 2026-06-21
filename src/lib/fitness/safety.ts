import type { ProfileInput, SafetyScreening } from "./types";

const highRiskTerms = [
  "card",
  "pressao",
  "pressão",
  "hipert",
  "diabet",
  "renal",
  "asma",
  "gravidez",
  "gestante",
  "cirurgia",
  "desmaio",
  "tromb",
  "avc",
  "infarto",
];

const injuryTerms = ["coluna", "ombro", "joelho", "quadril", "hérnia", "hernia", "tendinite", "lesao", "lesão"];

const medicationTerms = ["beta", "anticoagul", "insulina", "cortico", "anti-inflam", "controlado"];

function hasTerm(values: string[], terms: string[]) {
  const text = values.join(" ").toLowerCase();
  return terms.some((term) => text.includes(term));
}

export function screenHealth(profile: ProfileInput): SafetyScreening {
  const flags: string[] = [];
  const guidance: string[] = [];
  let score = 0;

  if (profile.age < 16) {
    score += 4;
    flags.push("idade abaixo de 16 anos");
    guidance.push("Treinos devem ser acompanhados por responsável e profissional habilitado.");
  }

  if (profile.age >= 60) {
    score += 2;
    flags.push("idade igual ou acima de 60 anos");
  }

  if (hasTerm(profile.conditions, highRiskTerms)) {
    score += 5;
    flags.push("condição de saúde que exige avaliação profissional");
    guidance.push("Antes de iniciar ou intensificar treinos, procure orientação médica ou profissional habilitado.");
  }

  if (hasTerm(profile.injuries, injuryTerms) || profile.limitations.length > 0) {
    score += 3;
    flags.push("lesão, dor ou limitação informada");
    guidance.push("O plano deve evitar dor, respeitar amplitude confortável e priorizar técnica.");
  }

  if (hasTerm(profile.medications, medicationTerms) || profile.medications.length > 0) {
    score += 2;
    flags.push("uso de medicamento informado");
  }

  if (profile.sleepHours < 5) {
    score += 1;
    flags.push("sono baixo");
    guidance.push("Recuperação baixa aumenta risco de queda de desempenho e desconfortos.");
  }

  if (profile.waterLiters < 1.5) {
    score += 1;
    flags.push("hidratação baixa");
  }

  const level = score >= 5 ? "HIGH" : score >= 2 ? "MODERATE" : "LOW";
  const requiresProfessionalReview = level === "HIGH" || flags.some((flag) => flag.includes("condição"));

  if (guidance.length === 0) {
    guidance.push("Use as metas como apoio de rotina e ajuste sinais de dor, fadiga ou desconforto.");
  }

  return {
    score,
    level,
    requiresProfessionalReview,
    flags,
    guidance,
  };
}
