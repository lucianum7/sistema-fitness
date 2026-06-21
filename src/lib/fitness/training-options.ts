export const trainingDays = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"] as const;

export type TrainingDay = (typeof trainingDays)[number];

export const trainingMethodologyValues = [
  "AUTO",
  "FULL_BODY",
  "AB",
  "ABC",
  "ABCD",
  "ABCDE",
  "UPPER_LOWER",
  "PUSH_PULL_LEGS",
  "FIVE_BY_FIVE",
  "POWERLIFTING",
  "GLUTES",
  "POSTERIOR_CHAIN",
  "CALISTHENICS",
  "KETTLEBELL",
  "CIRCUIT",
] as const;

export type TrainingMethodology = (typeof trainingMethodologyValues)[number];

export const trainingMethodologies: ReadonlyArray<{
  value: TrainingMethodology;
  label: string;
  minDays: number;
  description: string;
}> = [
  { value: "AUTO", label: "Automático Sistema Fitness", minDays: 2, description: "Escolhe a divisão mais adequada pelo perfil, objetivo e dias disponíveis." },
  { value: "FULL_BODY", label: "Full body", minDays: 2, description: "Corpo inteiro em cada sessão, útil para iniciantes, retorno gradual e poucas idas semanais." },
  { value: "AB", label: "AB", minDays: 2, description: "Alterna dois treinos, geralmente superior/inferior ou empurrar/puxar." },
  { value: "ABC", label: "ABC", minDays: 3, description: "Três treinos alternados por grupos musculares, com boa liberdade de agenda." },
  { value: "ABCD", label: "ABCD", minDays: 4, description: "Quatro sessões com maior especialização por grupo muscular." },
  { value: "ABCDE", label: "ABCDE", minDays: 5, description: "Cinco sessões com ênfase alta por grupos específicos." },
  { value: "UPPER_LOWER", label: "Upper/Lower", minDays: 4, description: "Alterna superior e inferior com volume equilibrado." },
  { value: "PUSH_PULL_LEGS", label: "Push/Pull/Legs", minDays: 3, description: "Empurrar, puxar e pernas, com boa progressão para hipertrofia." },
  { value: "FIVE_BY_FIVE", label: "5x5", minDays: 3, description: "Estrutura de força com básicos e progressão conservadora." },
  { value: "POWERLIFTING", label: "Powerlifting", minDays: 3, description: "Foco em agachamento, supino e terra, indicado para avançados." },
  { value: "GLUTES", label: "Ênfase em glúteos", minDays: 3, description: "Distribui estímulos de glúteos e membros inferiores durante a semana." },
  { value: "POSTERIOR_CHAIN", label: "Cadeia posterior", minDays: 3, description: "Prioriza posteriores, glúteos, dorsais e estabilidade." },
  { value: "CALISTHENICS", label: "Calistenia", minDays: 3, description: "Treinos com peso corporal, barras, paralelas e controle técnico." },
  { value: "KETTLEBELL", label: "Kettlebell", minDays: 3, description: "Mistura força, potência e condicionamento com kettlebell." },
  { value: "CIRCUIT", label: "Circuito", minDays: 2, description: "Sessões mais densas para condicionamento e resistência." },
];

export function getTrainingMethodology(value?: string | null) {
  return trainingMethodologies.find((item) => item.value === value) ?? trainingMethodologies[0];
}
