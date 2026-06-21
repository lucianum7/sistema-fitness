"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Mail, Plus, RefreshCw, Sparkles, Utensils } from "lucide-react";
import type { FoodSeed, GeneratedNutritionPlan, Meal, MealItem } from "@/lib/fitness/types";
import { Badge, Button, Card, HelpTip, SelectField, TextAreaField } from "./ui";

async function emailExport(type: string, range: "weekly" | "monthly" | undefined, setMessage: (value: string) => void, setBusy: (value: string | null) => void) {
  setBusy(`${type}-${range ?? ""}`);
  setMessage("");
  const result = await fetch("/api/exports/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type, range }),
  }).then((response) => response.json());
  setBusy(null);
  setMessage(result.ok ? `Enviamos para o seu e-mail (${result.data.to}).` : result.error ?? "Não foi possível enviar por e-mail.");
}

const mealNames = ["Café da manhã", "Almoço", "Lanche", "Jantar"] as const;
const objectiveLabels: Record<string, string> = {
  FAT_LOSS: "Perda de peso",
  HYPERTROPHY: "Ganho de massa muscular",
  RECOMPOSITION: "Recomposição corporal",
  STRENGTH: "Força",
  ENDURANCE: "Resistência",
  CONDITIONING: "Condicionamento",
  BEGINNER: "Início de rotina",
  RETURN_GRADUAL: "Retorno gradual",
};

const textFixes: Record<string, string> = {
  "Ã¡": "á",
  "Ã ": "à",
  "Ã¢": "â",
  "Ã£": "ã",
  "Ã©": "é",
  "Ãª": "ê",
  "Ã­": "í",
  "Ã³": "ó",
  "Ã´": "ô",
  "Ãµ": "õ",
  "Ãº": "ú",
  "Ã§": "ç",
};

const preferredFoodTerms = [
  "arroz",
  "feijao",
  "frango",
  "ovo",
  "iogurte",
  "aveia",
  "banana",
  "batata",
  "patinho",
  "tilapia",
  "salmao",
  "brocolis",
  "lentilha",
  "azeite",
  "castanha",
  "pao integral",
  "whey",
  "proteina vegetal",
];

const lowPriorityFoodTerms = ["bebida, mistura", "marshmallow", "cereal pronto", "enlatado", "pele", "figado", "sopa", "linguica", "bacon", "pimenta, banana"];

function readable(value: string) {
  return Object.entries(textFixes).reduce((text, [from, to]) => text.replaceAll(from, to), value);
}

function normalized(value: string) {
  return readable(value).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function foodOptionScore(food: FoodSeed) {
  const name = normalized(food.name);
  const source = normalized(food.source);
  const preferredIndex = preferredFoodTerms.findIndex((term) => name.includes(term));
  const preferred = preferredIndex >= 0 ? 90 - preferredIndex * 2 : 0;
  const sourceBonus = source.includes("tabela brasileira") || source.includes("taco") || source.includes("rotulo") ? 16 : 0;
  const penalty = lowPriorityFoodTerms.some((term) => name.includes(term)) ? -80 : 0;
  return preferred + sourceBonus + penalty - Math.max(food.name.length - 55, 0);
}

function foodOptionsFor(foods: FoodSeed[], item: MealItem) {
  const current = normalized(item.foodName);
  const options = foods
    .filter((food) => food.category === item.category && normalized(food.name) !== current)
    .sort((a, b) => foodOptionScore(b) - foodOptionScore(a));
  const preferredOptions = options.filter((food) => !lowPriorityFoodTerms.some((term) => normalized(food.name).includes(term)));
  return (preferredOptions.length >= 8 ? preferredOptions : options).slice(0, 18);
}

function recalcItem(item: MealItem, grams: number): MealItem {
  const factor = grams / Math.max(item.grams, 1);
  return {
    ...item,
    grams,
    calories: Math.round(item.calories * factor),
    proteinG: Math.round(item.proteinG * factor * 10) / 10,
    carbsG: Math.round(item.carbsG * factor * 10) / 10,
    fatG: Math.round(item.fatG * factor * 10) / 10,
    fiberG: Math.round(item.fiberG * factor * 10) / 10,
    sodiumMg: Math.round(item.sodiumMg * factor),
  };
}

function totals(items: MealItem[]) {
  return items.reduce(
    (sum, item) => ({
      calories: sum.calories + item.calories,
      proteinG: Math.round((sum.proteinG + item.proteinG) * 10) / 10,
      carbsG: Math.round((sum.carbsG + item.carbsG) * 10) / 10,
      fatG: Math.round((sum.fatG + item.fatG) * 10) / 10,
      fiberG: Math.round((sum.fiberG + item.fiberG) * 10) / 10,
      sodiumMg: sum.sodiumMg + item.sodiumMg,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sodiumMg: 0 },
  );
}

type ShoppingRange = "weekly" | "monthly";
type ShoppingItem = { item: string; grams: number; category: string; approximate: string; amount: string; basis: string };

function formatAmount(grams: number) {
  return grams >= 1000
    ? `${(grams / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`
    : `${Math.round(grams)} g`;
}

function formatCount(value: number) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: value < 10 ? 1 : 0 });
}

function formatApproximation(item: { item: string; grams: number }, foods: FoodSeed[]) {
  const food = foods.find((candidate) => normalized(candidate.name) === normalized(item.item));
  const name = normalized(item.item);
  if (name.includes("ovo")) {
    const eggs = Math.max(1, Math.round(item.grams / 50));
    return `aprox. ${eggs} ${eggs === 1 ? "ovo" : "ovos"}`;
  }

  if (!food || food.servingGrams <= 0) return "quantidade total em peso";
  const servings = Math.max(item.grams / food.servingGrams, 0.1);
  const servingLabel = readable(food.servingLabel);
  const measure = /^(\d+(?:[.,]\d+)?)\s+(.+)$/.exec(servingLabel);
  if (measure && !measure[2].toLowerCase().startsWith("g")) {
    const quantity = Number(measure[1].replace(",", ".")) * servings;
    const plurals: Record<string, string> = {
      "colher de sopa": "colheres de sopa",
      fatia: "fatias",
      unidade: "unidades",
      "concha média": "conchas médias",
      "punhado pequeno": "punhados pequenos",
      "filé médio": "filés médios",
      xícara: "xícaras",
    };
    const unit = quantity > 1 ? plurals[measure[2]] ?? measure[2] : measure[2];
    return `aprox. ${formatCount(quantity)} ${unit}`;
  }
  return `aprox. ${formatCount(servings)} porções de ${servingLabel}`;
}

// Medida caseira de um item da refeição (modo "sem balança").
function householdFor(item: MealItem, foods: FoodSeed[]) {
  const approx = formatApproximation({ item: item.foodName, grams: item.grams }, foods);
  if (approx.startsWith("aprox.")) return approx.replace("aprox. ", "≈ ");
  const label = readable(item.householdMeasure);
  if (label && !/^\d+(?:[.,]\d+)?\s*g\b/i.test(label)) return `≈ ${label}`;
  return `≈ ${Math.max(5, Math.round(item.grams / 5) * 5)} g (aprox.)`;
}

// Sugestão de indulgência calculada para o fim de semana, dentro de uma fração da meta diária.
function weekendTreat(dailyCalories: number) {
  const budget = Math.round(dailyCalories * 0.25);
  const burgerKcal = Math.round(budget * 0.7);
  // ~250 kcal por 100 g de hambúrguer duplo com bacon e cheddar montado.
  const burgerGrams = Math.max(120, Math.round((burgerKcal / 250) * 100));
  const drinkKcal = budget - burgerKcal;
  const sodaMl = Math.round((drinkKcal / 42) * 100); // refrigerante comum ~42 kcal/100 ml
  const wineMl = Math.round((drinkKcal / 85) * 100); // vinho tinto ~85 kcal/100 ml
  return { budget, burgerKcal, burgerGrams, drinkKcal, sodaMl, wineMl };
}

function buildShoppingList(plan: GeneratedNutritionPlan, range: ShoppingRange, foods: FoodSeed[], selectedWeek: number): ShoppingItem[] {
  const targetDays = range === "monthly" ? 30 : 7;
  // Dias-base para estimar o consumo médio diário: a semana escolhida (semana) ou todo o
  // calendário disponível (mês). Sem calendário, usamos o dia único do plano.
  const baseDays = plan.schedule?.length
    ? range === "monthly"
      ? plan.schedule.flatMap((week) => week.days)
      : (plan.schedule[selectedWeek] ?? plan.schedule[0]).days
    : [{ day: "dia", meals: plan.meals }];
  const dayCount = Math.max(baseDays.length, 1);
  // total = (soma dos dias-base / nº de dias) × dias-alvo. Assim o "mês" escala de verdade
  // mesmo quando o plano só tem 7 dias cadastrados (antes mostrava 7 dias rotulados como mês).
  const scale = targetDays / dayCount;

  const map = new Map<string, { item: string; grams: number; category: string }>();
  for (const item of baseDays.flatMap((day) => day.meals).flatMap((meal) => meal.items)) {
    const current = map.get(item.foodName) ?? { item: item.foodName, grams: 0, category: item.category };
    current.grams += item.grams;
    map.set(item.foodName, current);
  }

  return [...map.values()]
    .map((entry) => {
      const grams = Math.round(entry.grams * scale);
      return {
        item: entry.item,
        category: entry.category,
        grams,
        approximate: formatApproximation({ item: entry.item, grams }, foods),
        amount: formatAmount(grams),
        basis: `Estimativa para ${targetDays} dias (${dayCount} ${dayCount === 1 ? "dia" : "dias"} de cardápio)`,
      };
    })
    .sort((a, b) => a.category.localeCompare(b.category, "pt-BR") || readable(a.item).localeCompare(readable(b.item), "pt-BR"));
}

export function NutritionPlanner({
  initialPlan,
  foods,
  initialImmediateUsesByMeal,
  profileSummary,
}: {
  initialPlan: GeneratedNutritionPlan;
  foods: FoodSeed[];
  initialImmediateUsesByMeal: Record<string, number>;
  profileSummary: { objective: string; calories: number; tdee: number; goalAdjustmentPct: number };
}) {
  const [plan, setPlan] = useState(initialPlan);
  const [message, setMessage] = useState("");
  const [loadingAction, setLoadingAction] = useState<"brazilian" | "immediate" | null>(null);
  const [emailing, setEmailing] = useState<string | null>(null);
  const [availableFoods, setAvailableFoods] = useState("");
  const [mealName, setMealName] = useState<(typeof mealNames)[number]>("Almoço");
  const [immediateUsesByMeal, setImmediateUsesByMeal] = useState(initialImmediateUsesByMeal);
  const [shoppingRange, setShoppingRange] = useState<ShoppingRange>("weekly");
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [selectedDay, setSelectedDay] = useState(0);
  const [mealView, setMealView] = useState<number | "all">(0);
  const [measureMode, setMeasureMode] = useState<"balanca" | "sem">("balanca");
  const [weekendMode, setWeekendMode] = useState(false);
  const semBalanca = measureMode === "sem";
  const immediateUsesRemaining = Math.max(2 - (immediateUsesByMeal[mealName] ?? 0), 0);
  const displayedMeals = plan.schedule?.[selectedWeek]?.days[selectedDay]?.meals ?? plan.meals;
  const dayTotals = useMemo(() => totals(displayedMeals.flatMap((meal) => meal.items)), [displayedMeals]);
  // Mostra apenas a refeição escolhida (ou todas) para não pesar a tela.
  const viewedMeals = mealView === "all"
    ? displayedMeals.map((meal, index) => ({ meal, index }))
    : displayedMeals[mealView]
      ? [{ meal: displayedMeals[mealView], index: mealView }]
      : displayedMeals.map((meal, index) => ({ meal, index }));
  const shoppingList = useMemo(() => buildShoppingList(plan, shoppingRange, foods, selectedWeek), [foods, plan, selectedWeek, shoppingRange]);

  function updateMeal(mealIndex: number, updater: (meal: Meal) => Meal) {
    setPlan((current) => {
      if (!current.schedule?.length) {
        return { ...current, meals: current.meals.map((meal, index) => (index === mealIndex ? updater(meal) : meal)) };
      }
      const schedule = current.schedule.map((week, weekIndex) => weekIndex !== selectedWeek ? week : {
        ...week,
        days: week.days.map((day, dayIndex) => dayIndex !== selectedDay ? day : {
          ...day,
          meals: day.meals.map((meal, index) => (index === mealIndex ? updater(meal) : meal)),
        }),
      });
      return { ...current, schedule, meals: schedule[0].days[0].meals };
    });
  }

  async function generate(mode: "brazilian" | "immediate") {
    setLoadingAction(mode);
    setMessage("");
    const result = await fetch("/api/nutrition/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode, mealName, availableFoods }),
    }).then((response) => response.json());
    setLoadingAction(null);

    if (!result.ok) {
      setMessage(result.error);
      return;
    }

    setPlan(result.data.plan);
    setSelectedWeek(0);
    setSelectedDay(0);
    setMealView(0);
    if (result.data.immediateUsesByMeal) {
      setImmediateUsesByMeal((current) => ({ ...current, ...result.data.immediateUsesByMeal }));
    }
    const labels = {
      brazilian: "Plano de 7 dias gerado conforme seu objetivo e suas metas.",
      immediate: `${mealName} atualizado com o que você tem em casa.`,
    };
    setMessage(labels[mode]);
    if (mode === "immediate") {
      const used = result.data.immediateUsesByMeal?.[mealName] ?? immediateUsesByMeal[mealName] ?? 0;
      setMessage(`${mealName} atualizado. Restam ${Math.max(2 - used, 0)}/2 usos hoje.`);
    }
  }

  async function logMeal(meal: Meal) {
    const result = await fetch("/api/meal-logs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mealName: meal.name, items: meal.items, totals: meal.totals }),
    }).then((response) => response.json());
    setMessage(result.ok ? `${meal.name} registrada.` : result.error);
  }

  return (
    <div className="grid gap-6">
      <Card className="overflow-hidden p-0 md:p-0">
        <div className="border-b border-[var(--line)] p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge>Alimentação brasileira</Badge>
              <h2 className="mt-3 flex items-center gap-2 text-2xl font-black">
                Gerar plano alimentar
                <HelpTip content="As duas opções usam as metas calculadas, preferências, alergias e restrições do seu perfil." />
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                Objetivo: <strong className="text-[var(--foreground)]">{objectiveLabels[profileSummary.objective] ?? profileSummary.objective}</strong>. Gasto estimado de {profileSummary.tdee} kcal com meta de {plan.targets.calories} kcal ({profileSummary.goalAdjustmentPct > 0 ? "+" : ""}{profileSummary.goalAdjustmentPct}%).
              </p>
            </div>
            <Badge>{plan.durationDays ?? 7} dias no plano atual</Badge>
          </div>
        </div>

        <div>
          <section className="grid content-between gap-5 p-5 md:p-6">
            <div>
              <p className="text-xs font-black uppercase text-[var(--primary)]">Geração ilimitada</p>
              <h3 className="mt-2 text-xl font-black">Plano objetivo de 7 dias</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Usa o banco alimentar, a meta calórica científica e o objetivo selecionado no perfil. Gera sete dias variados.</p>
            </div>
            <Button type="button" onClick={() => void generate("brazilian")} disabled={loadingAction !== null}>
              {loadingAction === "brazilian" ? <RefreshCw className="animate-spin" size={16} /> : <Utensils size={16} />}
              Gerar novo plano
            </Button>
          </section>
        </div>

        <div className="flex flex-col gap-4 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--primary),transparent_93%)] p-5 sm:flex-row sm:items-center sm:justify-between md:px-6">
          <div><p className="font-black">Cardápio pronto para levar</p><p className="mt-1 text-sm text-[var(--muted)]">Enviamos o PDF (metas, refeições, porções, macros e lista de compras) direto no seu e-mail.</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" disabled={emailing !== null} onClick={() => void emailExport("cardapio", "weekly", setMessage, setEmailing)}>
              {emailing === "cardapio-weekly" ? <RefreshCw className="animate-spin" size={16} /> : <Mail size={16} />} Cardápio semanal por e-mail
            </Button>
            <Button type="button" disabled={emailing !== null} onClick={() => void emailExport("cardapio", "monthly", setMessage, setEmailing)}>
              {emailing === "cardapio-monthly" ? <RefreshCw className="animate-spin" size={16} /> : <Mail size={16} />} Cardápio mensal por e-mail
            </Button>
          </div>
        </div>

        <div className="grid gap-3 border-t border-[var(--line)] p-5 md:p-6 lg:grid-cols-[220px_1fr_auto] lg:items-end">
          <SelectField label="Refeição imediata" value={mealName} onChange={(event) => setMealName(event.target.value as (typeof mealNames)[number])}>
            {mealNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </SelectField>
          <TextAreaField
            label="O que tenho em casa agora"
            hint="Informe alimentos disponíveis para substituir a refeição escolhida. Limite: 2 gerações por refeição a cada dia."
            placeholder="Ex.: arroz, feijão, frango, ovos, tomate, banana"
            value={availableFoods}
            onChange={(event) => setAvailableFoods(event.target.value)}
          />
          <Button type="button" variant="secondary" onClick={() => void generate("immediate")} disabled={loadingAction !== null || availableFoods.trim().length === 0 || immediateUsesRemaining <= 0}>
            {loadingAction === "immediate" ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
            Gerar refeição ({immediateUsesRemaining}/2)
          </Button>
        </div>
      </Card>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["Calorias", `${plan.targets.calories} kcal`, "Meta diária estimada para o objetivo atual do aluno."],
          ["Proteínas", `${plan.targets.proteinG} g`, "Ajuda na recuperação e manutenção de massa magra."],
          ["Carboidratos", `${plan.targets.carbsG} g`, "Energia planejada para treino, rotina e recuperação."],
          ["Gorduras", `${plan.targets.fatG} g`, "Gorduras alimentares planejadas dentro da meta calórica."],
        ].map(([label, value, help]) => (
          <Card key={label} className="quiet-card">
            <p className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--muted)]">
              {label}
              <HelpTip content={help} />
            </p>
            <p className="mt-3 text-2xl font-black">{value}</p>
          </Card>
        ))}
      </section>

      {plan.alerts.length > 0 ? (
        <section className="grid gap-2 rounded-[8px] border border-[var(--gold)] bg-[var(--gold)]/10 p-4 text-sm md:p-5">
          {plan.alerts.map((alert) => (
            <p key={alert} className="flex items-center gap-2">
              <AlertCircle size={16} /> {alert}
            </p>
          ))}
        </section>
      ) : null}

      {message ? <p className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)] p-3 text-sm font-semibold text-[var(--primary)]">{message}</p> : null}

      {plan.schedule?.length ? (
        <section className="flex flex-col gap-4 border-y border-[var(--line)] py-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="font-black">Calendário do cardápio</p><p className="mt-1 text-sm text-[var(--muted)]">Escolha a semana e o dia para consultar as refeições.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField label="Semana" value={String(selectedWeek)} onChange={(event) => { setSelectedWeek(Number(event.target.value)); setSelectedDay(0); }}>
              {plan.schedule.map((week, index) => <option key={week.weekNumber} value={index}>Semana {week.weekNumber}</option>)}
            </SelectField>
            <SelectField label="Dia" value={String(selectedDay)} onChange={(event) => setSelectedDay(Number(event.target.value))}>
              {(plan.schedule[selectedWeek]?.days ?? []).map((day, index) => <option key={`${day.day}-${index}`} value={index}>{day.day}</option>)}
            </SelectField>
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="grid min-w-0 gap-5">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Refeições">
            {displayedMeals.map((meal, index) => (
              <button
                key={`tab-${meal.name}-${index}`}
                type="button"
                role="tab"
                aria-selected={mealView === index}
                onClick={() => setMealView(index)}
                className={`min-h-9 rounded-full border px-4 text-sm font-bold transition ${mealView === index ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm" : "border-[var(--line)] bg-[var(--surface-strong)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--foreground)]"}`}
              >
                {meal.name}
              </button>
            ))}
            <button
              type="button"
              role="tab"
              aria-selected={mealView === "all"}
              onClick={() => setMealView("all")}
              className={`min-h-9 rounded-full border px-4 text-sm font-bold transition ${mealView === "all" ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm" : "border-[var(--line)] bg-[var(--surface-strong)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--foreground)]"}`}
            >
              Todas
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)] p-1">
              {[
                ["balanca", "Com balança"],
                ["sem", "Sem balança"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMeasureMode(value as "balanca" | "sem")}
                  className="rounded-[6px] px-3 py-1 text-xs font-bold transition"
                  style={{ background: measureMode === value ? "var(--primary)" : "transparent", color: measureMode === value ? "#fff" : "var(--muted)" }}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="text-xs text-[var(--muted)]">{semBalanca ? "Mostrando medidas caseiras aproximadas (ex.: 2 ovos, 1 concha)." : "Mostrando o peso em gramas para quem usa balança."}</span>
            <button
              type="button"
              onClick={() => setWeekendMode((value) => !value)}
              className={`ml-auto inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-bold transition ${weekendMode ? "border-[var(--gold)] bg-[var(--gold)]/15 text-[var(--gold)]" : "border-[var(--line)] bg-[var(--surface-strong)] text-[var(--muted)] hover:border-[var(--gold)] hover:text-[var(--foreground)]"}`}
            >
              <Sparkles size={15} /> Modo fim de semana
            </button>
          </div>

          {weekendMode ? (() => {
            const treat = weekendTreat(plan.targets.calories);
            return (
              <article className="rounded-[8px] border border-[var(--gold)] bg-[var(--gold)]/10 p-4 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-[var(--gold)]">Modo fim de semana • sábado e domingo</p>
                    <h3 className="mt-1 text-xl font-black">Refeição livre calculada</h3>
                  </div>
                  <Badge>~{treat.budget} kcal liberadas</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Durante a semana você segue o plano à risca; no fim de semana, ~25% da meta diária ({plan.targets.calories} kcal) fica livre para um prazer, mantendo a média semanal no alvo.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)]/70 p-4">
                    <p className="font-black">🍔 Hambúrguer duplo, bacon e cheddar</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">≈ 1 unidade ({treat.burgerGrams} g) • ~{treat.burgerKcal} kcal</p>
                  </div>
                  <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)]/70 p-4">
                    <p className="font-black">🥤 Bebida do prazer</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">~{treat.drinkKcal} kcal: ≈ {treat.sodaMl} ml de refrigerante OU ≈ {treat.wineMl} ml de vinho</p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-5 text-[var(--muted)]">💧 Beba ~500 ml de água a mais neste dia. Cálculos aproximados — use como referência, não precisa pesar.</p>
              </article>
            );
          })() : null}

          {viewedMeals.map(({ meal, index: mealIndex }) => (
            <article key={meal.name} className="soft-card min-w-0 rounded-[8px] p-4 md:p-6">
              <div className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black">{meal.name}</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {meal.totals.calories} kcal | P {meal.totals.proteinG} g | C {meal.totals.carbsG} g | G {meal.totals.fatG} g
                  </p>
                </div>
                <Button type="button" variant="secondary" onClick={() => void logMeal(meal)}>
                  <CheckCircle2 size={16} /> Marcar consumida
                </Button>
              </div>

              <div className="mt-5 grid gap-3">
                {meal.items.map((item, itemIndex) => (
                  <div key={`${meal.name}-${item.foodName}`} className="grid min-w-0 gap-3 rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)]/55 p-4 lg:grid-cols-[minmax(0,1fr)_104px_minmax(150px,210px)] lg:items-end">
                    <div className="min-w-0">
                      <p className="break-words font-bold">{readable(item.foodName)}</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                        {semBalanca
                          ? `${householdFor(item, foods)} | ${item.calories} kcal (aprox.)`
                          : `${readable(item.householdMeasure)} | ${item.calories} kcal | fibras ${item.fiberG} g | sódio ${item.sodiumMg} mg`}
                      </p>
                    </div>
                    {semBalanca ? (
                      <div className="grid min-w-0 gap-2 text-sm font-semibold">
                        <span className="flex items-center gap-2">
                          Medida
                          <HelpTip content="Quantidade aproximada em medida caseira — sem precisar de balança." />
                        </span>
                        <div className="min-h-10 w-full rounded-[8px] border border-dashed border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-[var(--primary)]">
                          {householdFor(item, foods)}
                        </div>
                      </div>
                    ) : (
                      <label className="grid min-w-0 gap-2 text-sm font-semibold">
                        <span className="flex items-center gap-2">
                          Gramas
                          <HelpTip content="Altere a porção em gramas; calorias e macros deste alimento são recalculados na hora." />
                        </span>
                        <input
                          className="min-h-10 w-full min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 outline-none transition focus:border-[var(--primary)]"
                          type="number"
                          value={item.grams}
                          onChange={(event) =>
                            updateMeal(mealIndex, (current) => {
                              const items = current.items.map((mealItem, index) => (index === itemIndex ? recalcItem(mealItem, Number(event.target.value)) : mealItem));
                              return { ...current, items, totals: totals(items) };
                            })
                          }
                        />
                      </label>
                    )}
                    <label className="grid min-w-0 gap-2 text-sm font-semibold">
                      <span className="flex items-center gap-2">
                        Trocar por
                        <HelpTip content="Substitui por alimento equivalente da mesma categoria para preservar a lógica de macros." />
                      </span>
                      <select
                        className="min-h-10 w-full min-w-0 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] px-3 outline-none transition focus:border-[var(--primary)]"
                        value=""
                        onChange={(event) => {
                          const replacement = foods.find((food) => food.name === event.target.value);
                          if (!replacement) return;
                          updateMeal(mealIndex, (current) => {
                            const items = current.items.map((mealItem, index) =>
                              index === itemIndex
                                ? (() => {
                                    const grams = Math.round((mealItem.calories / Math.max(replacement.calories100g, 1)) * 100);
                                    const factor = grams / 100;
                                    return {
                                      ...mealItem,
                                      foodName: readable(replacement.name),
                                      grams,
                                      householdMeasure: readable(replacement.servingLabel),
                                      category: replacement.category,
                                      calories: Math.round(replacement.calories100g * factor),
                                      proteinG: Math.round(replacement.protein100g * factor * 10) / 10,
                                      carbsG: Math.round(replacement.carbs100g * factor * 10) / 10,
                                      fatG: Math.round(replacement.fat100g * factor * 10) / 10,
                                      fiberG: Math.round(replacement.fiber100g * factor * 10) / 10,
                                      sodiumMg: Math.round(replacement.sodium100g * factor),
                                      equivalents: foods
                                        .filter((food) => food.category === replacement.category && food.name !== replacement.name)
                                        .sort((a, b) => foodOptionScore(b) - foodOptionScore(a))
                                        .slice(0, 4)
                                        .map((food) => readable(food.name)),
                                    };
                                  })()
                                : mealItem,
                            );
                            return { ...current, items, totals: totals(items) };
                          });
                        }}
                      >
                        <option value="">Selecionar</option>
                        {foodOptionsFor(foods, item).map((food) => (
                          <option key={food.name} value={food.name}>
                            {readable(food.name)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        <aside className="grid h-max gap-4 xl:sticky xl:top-8">
          <Card>
            <h2 className="flex items-center gap-2 font-black">
              Total do dia
              <HelpTip content="Soma das refeições exibidas abaixo. Se alterar porções, estes totais mudam junto." />
            </h2>
            <div className="mt-4 grid gap-3 text-sm">
              {[
                ["Calorias", dayTotals.calories],
                ["Proteínas", `${dayTotals.proteinG} g`],
                ["Carboidratos", `${dayTotals.carbsG} g`],
                ["Gorduras", `${dayTotals.fatG} g`],
                ["Fibras", `${dayTotals.fiberG} g`],
              ].map(([label, value]) => (
                <p key={label} className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-2 last:border-0 last:pb-0">
                  <span className="text-[var(--muted)]">{label}</span>
                  <strong>{value}</strong>
                </p>
              ))}
            </div>
          </Card>
          <Card>
            <div className="grid gap-3">
              <h2 className="flex items-center gap-2 font-black">
                Lista de compras
                <HelpTip content="Soma as porções de cada dia. O peso é a referência principal; a medida caseira é aproximada." />
              </h2>
              <div className="grid grid-cols-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)] p-1">
                {[
                  ["weekly", "Semana"],
                  ["monthly", "Mês"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setShoppingRange(value as ShoppingRange)}
                    className="rounded-[6px] px-3 py-1 text-xs font-bold transition"
                    style={{ background: shoppingRange === value ? "var(--primary)" : "transparent", color: shoppingRange === value ? "#fff" : "var(--muted)" }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs leading-5 text-[var(--muted)]">{shoppingRange === "monthly" ? "Total para quatro semanas" : `Total da semana ${selectedWeek + 1}`}. Pesos de itens cozidos ou preparados seguem a descrição do alimento.</p>
            </div>
            <div className="mt-4 grid max-h-[620px] gap-3 overflow-y-auto pr-1">
              {shoppingList.map((item) => (
                <div key={item.item} className="grid gap-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface-strong)]/55 p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 break-words font-semibold">{readable(item.item)}</span>
                    <strong className="shrink-0 text-[var(--primary)]">{item.amount}</strong>
                  </div>
                  <p className="text-xs font-semibold">{item.approximate}</p>
                  <p className="text-[11px] text-[var(--muted)]">{item.basis}</p>
                </div>
              ))}
            </div>
          </Card>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const mealIndex = displayedMeals.findIndex((meal) => meal.name === "Lanche");
              if (mealIndex < 0) return;
              updateMeal(mealIndex, (meal) => {
                const items = [...meal.items, {
                  foodName: "Item personalizado",
                  grams: 100,
                  householdMeasure: "1 porção",
                  category: "personalizado",
                  calories: 100,
                  proteinG: 5,
                  carbsG: 15,
                  fatG: 3,
                  fiberG: 2,
                  sodiumMg: 80,
                  equivalents: [],
                }];
                return { ...meal, items, totals: totals(items) };
              });
            }}
          >
            <Plus size={16} /> Adicionar alimento ao lanche
          </Button>
        </aside>
      </div>
    </div>
  );
}
