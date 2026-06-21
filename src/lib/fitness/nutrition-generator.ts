import type { FoodSeed, GeneratedNutritionPlan, MacroTargets, Meal, MealItem, ProfileInput } from "./types";

const round = (value: number, precision = 0) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
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
  "Ã": "Á",
  "Ã€": "À",
  "Ã‚": "Â",
  "Ãƒ": "Ã",
  "Ã‰": "É",
  "ÃŠ": "Ê",
  "Ã": "Í",
  "Ã“": "Ó",
  "Ã”": "Ô",
  "Ã•": "Õ",
  "Ãš": "Ú",
  "Ã‡": "Ç",
};

function readable(value: string) {
  return Object.entries(textFixes).reduce((text, [from, to]) => text.replaceAll(from, to), value);
}

function normalized(value: string) {
  return readable(value).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

const brazilianStaples = [
  "arroz",
  "feijao",
  "frango",
  "ovo",
  "batata",
  "mandioca",
  "banana",
  "aveia",
  "iogurte",
  "leite",
  "pao integral",
  "patinho",
  "tilapia",
  "salmao",
  "lentilha",
  "brocolis",
  "abobora",
  "azeite",
  "castanha",
  "tofu",
  "whey",
  "proteina vegetal",
];

const avoidTerms = [
  "bebida, mistura",
  "marshmallow",
  "cereal pronto",
  "hamburguer",
  "enlatado",
  "condensada",
  "pele",
  "pes,",
  "figado",
  "linguica",
  "bacon",
  "curado",
  "barbecue",
  "refrito",
  "sopa",
  "pimenta, banana",
  "seca",
  "em po",
  "mistura para",
  "sementes maduras",
  "oleaginosas,",
  "macarrao de arroz",
  "grao longo",
  "somente carne",
  "moela",
  "para assar",
  "pasta de",
];

type MealKind = "breakfast" | "lunch" | "snack" | "dinner";
type FoodRole = "protein" | "carb" | "plant" | "fat";

const mealKindByName: Record<string, MealKind> = {
  "cafe da manha": "breakfast",
  almoco: "lunch",
  lanche: "snack",
  jantar: "dinner",
};

const mealTerms: Record<MealKind, Record<FoodRole, string[]>> = {
  breakfast: {
    protein: ["ovo", "iogurte", "leite", "whey", "proteina vegetal"],
    carb: ["aveia", "pao integral", "banana", "maca"],
    plant: ["banana", "maca"],
    fat: ["castanha", "azeite"],
  },
  lunch: {
    protein: ["frango", "patinho", "carne", "tilapia", "salmao", "ovo", "file", "coxa", "alcatra", "acem"],
    carb: ["arroz", "batata", "mandioca", "macarrao"],
    plant: ["feijao", "lentilha", "brocolis", "abobora", "verdura", "salada"],
    fat: ["azeite", "castanha", "abacate"],
  },
  snack: {
    protein: ["iogurte", "whey", "leite", "ovo", "proteina vegetal", "tofu"],
    carb: ["banana", "aveia", "pao integral", "maca", "batata"],
    plant: ["banana", "maca"],
    fat: ["castanha", "azeite", "abacate"],
  },
  dinner: {
    protein: ["frango", "ovo", "tilapia", "salmao", "patinho", "file", "coxa", "carne"],
    carb: ["arroz", "batata", "mandioca", "macarrao"],
    plant: ["feijao", "lentilha", "brocolis", "abobora", "verdura", "salada"],
    fat: ["azeite", "castanha", "abacate"],
  },
};

const roleCategories: Record<FoodRole, string[]> = {
  protein: ["proteina", "suplemento", "laticinio"],
  carb: ["carboidrato", "leguminosa", "fruta"],
  plant: ["verdura", "leguminosa", "fruta"],
  fat: ["gordura"],
};

const familiarRoleTerms: Record<FoodRole, string[]> = {
  protein: ["peito de frango grelhado", "ovo inteiro", "iogurte natural", "leite sem lactose", "patinho", "tilapia", "tofu", "whey"],
  carb: ["arroz integral cozido", "batata doce cozida", "aveia em flocos", "pao integral", "banana prata", "maca"],
  plant: ["feijao carioca cozido", "lentilha cozida", "brocolis cozido", "abobora cozida", "banana prata", "maca"],
  fat: ["azeite de oliva", "castanha de caju", "abacate"],
};

const rolePortions: Record<MealKind, Record<FoodRole, { share: number; min: number; max: number }>> = {
  breakfast: {
    protein: { share: 0.28, min: 50, max: 170 },
    carb: { share: 0.35, min: 35, max: 140 },
    plant: { share: 0.16, min: 70, max: 140 },
    fat: { share: 0.08, min: 10, max: 25 },
  },
  lunch: {
    protein: { share: 0.32, min: 100, max: 190 },
    carb: { share: 0.34, min: 100, max: 230 },
    plant: { share: 0.18, min: 80, max: 160 },
    fat: { share: 0.06, min: 8, max: 15 },
  },
  snack: {
    protein: { share: 0.30, min: 30, max: 170 },
    carb: { share: 0.32, min: 35, max: 120 },
    plant: { share: 0.18, min: 70, max: 140 },
    fat: { share: 0.08, min: 10, max: 25 },
  },
  dinner: {
    protein: { share: 0.34, min: 100, max: 180 },
    carb: { share: 0.28, min: 80, max: 200 },
    plant: { share: 0.22, min: 80, max: 170 },
    fat: { share: 0.06, min: 8, max: 15 },
  },
};

function nutritionFor(food: FoodSeed, grams: number): Omit<MealItem, "foodName" | "grams" | "householdMeasure" | "category" | "equivalents"> {
  const factor = grams / 100;
  return {
    calories: round(food.calories100g * factor),
    proteinG: round(food.protein100g * factor, 1),
    carbsG: round(food.carbs100g * factor, 1),
    fatG: round(food.fat100g * factor, 1),
    fiberG: round(food.fiber100g * factor, 1),
    sodiumMg: round(food.sodium100g * factor),
  };
}

function addTotals(items: MealItem[]) {
  return items.reduce(
    (total, item) => ({
      calories: total.calories + item.calories,
      proteinG: round(total.proteinG + item.proteinG, 1),
      carbsG: round(total.carbsG + item.carbsG, 1),
      fatG: round(total.fatG + item.fatG, 1),
      fiberG: round(total.fiberG + item.fiberG, 1),
      sodiumMg: total.sodiumMg + item.sodiumMg,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sodiumMg: 0 },
  );
}

function allowedFoods(profile: ProfileInput, foods: FoodSeed[]) {
  const blocked = [...profile.allergies, ...profile.intolerances, ...profile.restrictions].map((item) => normalized(item));
  return foods.filter((food) => {
    const tags = [...food.allergens, ...food.restrictions].map((item) => normalized(item));
    return !tags.some((tag) => blocked.some((block) => tag.includes(block) || block.includes(tag)));
  });
}

function stapleScore(food: FoodSeed) {
  const name = normalized(food.name);
  const source = normalized(food.source);
  const index = brazilianStaples.findIndex((term) => name.includes(term));
  const staple = index >= 0 ? 80 - index * 2 : 0;
  const sourceBonus = source.includes("tabela brasileira") || source.includes("taco") || source.includes("rotulo") ? 18 : 0;
  const preparationBonus = ["cozido", "grelhado", "integral", "natural"].some((term) => name.includes(term)) ? 8 : 0;
  const densityBonus = food.protein100g >= 8 || food.fiber100g >= 3 ? 4 : 0;
  const processedPenalty = avoidTerms.some((term) => name.includes(term)) ? -80 : 0;
  const rawPenalty = name.includes("in natura") && !["banana", "maca", "abacate"].some((term) => name.includes(term)) ? -14 : 0;
  const longNamePenalty = food.name.length > 70 ? -18 : food.name.length > 45 ? -7 : 2;
  return staple + sourceBonus + preparationBonus + densityBonus + processedPenalty + rawPenalty + longNamePenalty;
}

function roleScore(food: FoodSeed, kind: MealKind, role: FoodRole) {
  const name = normalized(food.name);
  const preferred = mealTerms[kind][role];
  const preferenceIndex = preferred.findIndex((term) => name.includes(term));
  const preferenceScore = preferenceIndex >= 0 ? 120 - preferenceIndex * 6 : 0;
  const categoryScore = roleCategories[role].includes(food.category) ? 35 : -40;
  return preferenceScore + categoryScore + stapleScore(food);
}

function sortForBrazilianMeals(foods: FoodSeed[]) {
  return [...foods].sort((a, b) => {
    const scoreDiff = stapleScore(b) - stapleScore(a);
    if (scoreDiff !== 0) return scoreDiff;
    return readable(a.name).localeCompare(readable(b.name), "pt-BR");
  });
}

function mealKind(name: string): MealKind {
  return mealKindByName[normalized(name)] ?? "lunch";
}

// Padrão brasileiro: almoço e jantar exigem proteína ANIMAL (carne, frango, peixe, ovo, laticínio).
const plantProteinTerms = [
  "tofu",
  "soja",
  "proteina vegetal",
  "proteina de soja",
  "grao de bico",
  "grao-de-bico",
  "feijao",
  "lentilha",
  "ervilha",
  "seitan",
  "tempeh",
  "edamame",
  "vegetal",
  "vegano",
];

function isAnimalProtein(food: FoodSeed) {
  const name = normalized(food.name);
  if (plantProteinTerms.some((term) => name.includes(term))) return false;
  return ["proteina", "laticinio", "suplemento"].includes(food.category);
}

function findFood(foods: FoodSeed[], kind: MealKind, role: FoodRole, used: Set<string>, variation = 0, rng?: () => number, animalOnly = false) {
  let pool = foods.filter((food) => roleCategories[role].includes(food.category) && !used.has(food.name));
  if (animalOnly) {
    const animal = pool.filter(isAnimalProtein);
    // Só aplica a regra se houver opção animal (respeita vegetariano/vegano, que já filtrou o banco antes).
    if (animal.length > 0) pool = animal;
  }
  const candidates = pool.length > 0 ? pool : foods.filter((food) => !used.has(food.name));
  const ranked = [...candidates].sort((a, b) => roleScore(b, kind, role) - roleScore(a, kind, role));
  const familiar = ranked.filter((food) => {
    const name = normalized(food.name);
    return familiarRoleTerms[role].some((term) => name === term || name.startsWith(`${term},`))
      && mealTerms[kind][role].some((term) => name.includes(term))
      && !avoidTerms.some((term) => name.includes(term));
  });
  const options = familiar.length > 0 ? familiar : ranked;
  // Com rng: sorteia entre os melhores (top 5) para variar a cada geração; sem rng,
  // usa a variação determinística por índice. Em ambos os casos respeita o ranking/restrições.
  const index = rng ? Math.floor(rng() * Math.min(options.length, 5)) : variation % Math.min(options.length, 4);
  return options[index] ?? options[0] ?? foods[0];
}

function gramsFor(food: FoodSeed, mealCalories: number, kind: MealKind, role: FoodRole) {
  const portion = rolePortions[kind][role];
  const calculated = (mealCalories * portion.share) / Math.max(food.calories100g, 1) * 100;
  const preferred = food.servingGrams > 0 ? food.servingGrams : calculated;
  const blend = (calculated + preferred) / 2;
  return round(Math.min(Math.max(blend, portion.min), portion.max));
}

function makeItem(food: FoodSeed, grams: number, foods: FoodSeed[], kind: MealKind, role: FoodRole): MealItem {
  const equivalents = foods
    .filter((item) => item.category === food.category && item.name !== food.name)
    .sort((a, b) => roleScore(b, kind, role) - roleScore(a, kind, role))
    .filter((item) => {
      const name = normalized(item.name);
      return familiarRoleTerms[role].some((term) => name === term || name.startsWith(`${term},`))
        && mealTerms[kind][role].some((term) => name.includes(term))
        && !avoidTerms.some((term) => name.includes(term));
    })
    .slice(0, 4)
    .map((item) => readable(item.name));

  return {
    foodName: readable(food.name),
    grams,
    householdMeasure: readable(food.servingLabel),
    category: food.category,
    ...nutritionFor(food, grams),
    equivalents,
  };
}

function scaleItem(item: MealItem, factor: number): MealItem {
  return {
    ...item,
    grams: round(item.grams * factor),
    calories: round(item.calories * factor),
    proteinG: round(item.proteinG * factor, 1),
    carbsG: round(item.carbsG * factor, 1),
    fatG: round(item.fatG * factor, 1),
    fiberG: round(item.fiberG * factor, 1),
    sodiumMg: round(item.sodiumMg * factor),
  };
}

function mealFromTemplate(name: string, share: number, targets: MacroTargets, foods: FoodSeed[], variation = 0, rng?: () => number): Meal {
  const used = new Set<string>();
  const kind = mealKind(name);
  const mealCalories = targets.calories * share;
  const roles: FoodRole[] = ["protein", "carb", "plant", "fat"];
  const baseItems = roles.map((role) => {
    // Almoço e jantar: a proteína principal precisa ser de origem animal (padrão brasileiro).
    const animalOnly = role === "protein" && (kind === "lunch" || kind === "dinner");
    const food = findFood(foods, kind, role, used, variation, rng, animalOnly);
    used.add(food.name);
    return makeItem(food, gramsFor(food, mealCalories, kind, role), foods, kind, role);
  });
  const baseCalories = addTotals(baseItems).calories;
  const scale = Math.min(Math.max(mealCalories / Math.max(baseCalories, 1), 0.7), 1.7);
  const items = baseItems.map((item) => scaleItem(item, scale));

  return {
    name,
    targetShare: share,
    items,
    totals: addTotals(items),
  };
}

function shoppingListFor(meals: Meal[], multiplier = 1) {
  const shoppingMap = new Map<string, { item: string; grams: number; category: string }>();
  for (const item of meals.flatMap((meal) => meal.items)) {
    const current = shoppingMap.get(item.foodName) ?? { item: item.foodName, grams: 0, category: item.category };
    current.grams += item.grams * multiplier;
    shoppingMap.set(item.foodName, current);
  }
  return [...shoppingMap.values()].map((item) => ({ ...item, grams: round(item.grams) }));
}

export function generateImmediateMeal(profile: ProfileInput, targets: MacroTargets, foods: FoodSeed[], mealName: string, availableText: string): Meal {
  const terms = availableText
    .split(/,|;|\n/)
    .map((item) => normalized(item.trim()))
    .filter(Boolean);
  const allowed = sortForBrazilianMeals(allowedFoods(profile, foods));
  const matched = allowed.filter((food) => terms.some((term) => normalized(food.name).includes(term) || term.includes(normalized(food.name))));
  const prioritized = matched.length > 0 ? [...matched, ...allowed.filter((food) => !matched.includes(food))] : allowed;
  const share = mealKind(mealName) === "lunch" || mealKind(mealName) === "dinner" ? 0.35 : mealKind(mealName) === "snack" ? 0.15 : 0.25;
  return mealFromTemplate(readable(mealName), share, targets, prioritized);
}

export function generateNutritionPlan(profile: ProfileInput, targets: MacroTargets, foods: FoodSeed[], rng: () => number = Math.random): GeneratedNutritionPlan {
  const usableFoods = allowedFoods(profile, foods);
  const safeFoods = sortForBrazilianMeals(usableFoods.length >= 4 ? usableFoods : foods);
  const mealTemplates = [
    ["Café da manhã", 0.25],
    ["Almoço", 0.35],
    ["Lanche", 0.15],
    ["Jantar", 0.25],
  ] as const;
  const dayNames = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  // Sorteia entre os melhores alimentos de cada papel (via rng), variando o cardápio a
  // cada geração e dia a dia, sem violar metas, alergias e restrições.
  const days = dayNames.map((day, dayIndex) => ({
    day,
    meals: mealTemplates.map(([name, share], mealIndex) => mealFromTemplate(name, share, targets, safeFoods, dayIndex + mealIndex, rng)),
  }));
  const schedule = [{ weekNumber: 1, days }];
  const meals = days[0].meals;

  const totals = addTotals(meals.flatMap((meal) => meal.items));
  const alerts: string[] = [];
  if (totals.proteinG < targets.proteinG * 0.9) alerts.push("Proteína planejada abaixo da meta.");
  if (totals.fiberG < targets.fiberG * 0.85) alerts.push("Fibras planejadas abaixo da meta.");
  if (totals.calories > targets.calories * 1.08) alerts.push("Calorias planejadas acima da meta.");
  if (profile.waterLiters * 1000 < targets.waterMl * 0.75) alerts.push("Hidratação atual abaixo da recomendação estimada.");

  return {
    title: "Plano alimentar Sistema Fitness - 7 dias",
    targets,
    meals,
    alerts,
    shoppingList: shoppingListFor(days.flatMap((day) => day.meals)),
    schedule,
    durationDays: 7,
    generationMode: "standard",
    requestText: null,
  };
}

export function swapMealItem(plan: GeneratedNutritionPlan, mealName: string, foodName: string, replacement: FoodSeed): GeneratedNutritionPlan {
  const meals = plan.meals.map((meal) => {
    if (meal.name !== mealName) return meal;
    const items = meal.items.map((item) => {
      if (item.foodName !== foodName) return item;
      const grams = round((item.calories / Math.max(replacement.calories100g, 1)) * 100);
      return {
        ...item,
        foodName: readable(replacement.name),
        grams,
        householdMeasure: readable(replacement.servingLabel),
        category: replacement.category,
        ...nutritionFor(replacement, grams),
      };
    });
    return { ...meal, items, totals: addTotals(items) };
  });

  return { ...plan, meals, shoppingList: shoppingListFor(meals, plan.durationDays ?? 7) };
}

export function mealItemFromFood(food: FoodSeed, grams: number, foods: FoodSeed[], mealName: string): MealItem {
  const category = normalized(food.category);
  const role: FoodRole = ["proteina", "laticinio", "suplemento"].includes(category)
    ? "protein"
    : category === "gordura"
      ? "fat"
      : ["verdura", "leguminosa", "fruta"].includes(category)
        ? "plant"
        : "carb";
  return makeItem(food, Math.min(Math.max(round(grams), 5), 1000), foods, mealKind(mealName), role);
}

export function calculateMealTotals(items: MealItem[]) {
  return addTotals(items);
}

export function shoppingListFromMeals(meals: Meal[]) {
  return shoppingListFor(meals);
}
