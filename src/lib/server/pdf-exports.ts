import type { GeneratedWorkoutPlan, MacroTargets, Meal, NutritionWeek } from "@/lib/fitness/types";
import { ApiError } from "./api";
import { getPrisma } from "./db";
import { createBrandedPdf, finalizePdf, pdfMetaStrip, pdfSectionTitle, PDF_BRAND } from "./pdf";

type Doc = PDFKit.PDFDocument;
export type BuiltFile = { buffer: Buffer; filename: string; contentType: string };

async function docToBuffer(doc: Doc, chunks: Buffer[], disclaimer: string): Promise<Buffer> {
  finalizePdf(doc, disclaimer);
  await new Promise<void>((resolve) => doc.on("end", resolve));
  return Buffer.concat(chunks);
}

function dayTotals(meals: Meal[]) {
  return meals.reduce((total, meal) => ({
    calories: total.calories + meal.totals.calories,
    proteinG: total.proteinG + meal.totals.proteinG,
    carbsG: total.carbsG + meal.totals.carbsG,
    fatG: total.fatG + meal.totals.fatG,
    fiberG: total.fiberG + meal.totals.fiberG,
  }), { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 });
}

function shoppingList(weeks: NutritionWeek[]) {
  const items = new Map<string, number>();
  for (const item of weeks.flatMap((week) => week.days.flatMap((day) => day.meals.flatMap((meal) => meal.items)))) {
    items.set(item.foodName, (items.get(item.foodName) ?? 0) + item.grams);
  }
  return [...items.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
}

export async function buildCardapioPdf(userId: string, range: "weekly" | "monthly"): Promise<BuiltFile> {
  const prisma = getPrisma();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
  const plan = await prisma.nutritionPlan.findFirst({
    where: { userId, status: { in: ["ACTIVE", "NEEDS_REVIEW"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!plan) throw new ApiError("Plano alimentar não encontrado.", 404);

  const meals = plan.meals as unknown as Meal[];
  const persistedSchedule = plan.schedule as unknown as NutritionWeek[];
  const fallbackWeek: NutritionWeek = {
    weekNumber: 1,
    days: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"].map((day) => ({ day, meals })),
  };
  const availableWeeks = persistedSchedule.length > 0 ? persistedSchedule : [fallbackWeek];
  const weeks = range === "monthly"
    ? Array.from({ length: 4 }, (_, index) => availableWeeks[index] ?? { ...availableWeeks[0], weekNumber: index + 1 })
    : [availableWeeks[0]];
  const targets = plan.targets as unknown as MacroTargets;

  const { doc, chunks } = createBrandedPdf({
    title: range === "monthly" ? "Cardápio mensal detalhado" : "Cardápio semanal detalhado",
    subtitle: plan.title,
    meta: [
      `Aluno: ${user.name}`,
      `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
      ...(plan.requestText ? [`Preferências informadas: ${plan.requestText}`] : []),
    ],
  });

  pdfMetaStrip(doc, `Metas diárias:  ${targets.calories} kcal   ·   Proteínas ${targets.proteinG} g   ·   Carboidratos ${targets.carbsG} g   ·   Gorduras ${targets.fatG} g   ·   Fibras ${targets.fiberG} g   ·   Água ${(targets.waterMl / 1000).toFixed(1)} L`);
  if (plan.alerts.length > 0) {
    doc.fillColor("#92400e").font("Helvetica-Bold").fontSize(9).text(`Atenção: ${plan.alerts.join("  •  ")}`);
    doc.moveDown(0.3);
  }

  const ensureSpace = (height = 120) => {
    if (doc.y + height > doc.page.height - 56) doc.addPage();
  };

  for (const week of weeks) {
    pdfSectionTitle(doc, `Semana ${week.weekNumber}`);
    for (const day of week.days) {
      ensureSpace(150);
      const totals = dayTotals(day.meals);
      doc.fillColor(PDF_BRAND.ink).font("Helvetica-Bold").fontSize(12).text(day.day);
      doc.fillColor(PDF_BRAND.muted).font("Helvetica").fontSize(8.5).text(`${Math.round(totals.calories)} kcal  |  P ${totals.proteinG.toFixed(1)} g  |  C ${totals.carbsG.toFixed(1)} g  |  G ${totals.fatG.toFixed(1)} g  |  Fibras ${totals.fiberG.toFixed(1)} g`);
      for (const meal of day.meals) {
        ensureSpace(60 + meal.items.length * 13);
        doc.moveDown(0.3);
        doc.fillColor(PDF_BRAND.primaryStrong).font("Helvetica-Bold").fontSize(10.5).text(meal.name);
        doc.fillColor(PDF_BRAND.muted).font("Helvetica").fontSize(8).text(`${meal.totals.calories} kcal  |  P ${meal.totals.proteinG} g  |  C ${meal.totals.carbsG} g  |  G ${meal.totals.fatG} g`);
        for (const item of meal.items) {
          doc.fillColor(PDF_BRAND.ink).font("Helvetica").fontSize(9).text(`•  ${item.foodName}: ${Math.round(item.grams)} g (${item.householdMeasure})`, { indent: 8 });
        }
      }
      doc.moveDown(0.6);
    }
  }

  pdfSectionTitle(doc, range === "monthly" ? "Lista de compras do mês" : "Lista de compras da semana");
  doc.fillColor(PDF_BRAND.muted).font("Helvetica").fontSize(9).text("Os pesos refletem o alimento conforme descrito no cardápio (cozido, grelhado ou in natura).");
  doc.moveDown(0.3);
  for (const [item, grams] of shoppingList(weeks)) {
    ensureSpace(18);
    const amount = grams >= 1000 ? `${(grams / 1000).toFixed(1).replace(".", ",")} kg` : `${Math.round(grams)} g`;
    doc.fillColor(PDF_BRAND.ink).font("Helvetica").fontSize(10).text(`•  ${item}: ${amount}`);
  }

  return { buffer: await docToBuffer(doc, chunks, "Material de organização alimentar. Não substitui avaliação de nutricionista ou médico."), filename: `sistema-fitness-cardapio-${range === "monthly" ? "mensal" : "semanal"}.pdf`, contentType: "application/pdf" };
}

export async function buildFichaPdf(userId: string): Promise<BuiltFile> {
  const prisma = getPrisma();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
  const planRecord = await prisma.workoutPlan.findFirst({
    where: { userId, status: { in: ["ACTIVE", "NEEDS_REVIEW"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!planRecord) throw new ApiError("Plano de treino não encontrado.", 404);
  const plan = planRecord.data as unknown as GeneratedWorkoutPlan;

  const { doc, chunks } = createBrandedPdf({
    title: "Ficha de treino",
    subtitle: plan.title,
    meta: [
      `Aluno: ${user.name}`,
      `Metodologia: ${plan.methodologyLabel ?? "Sistema Fitness"}  ·  ${plan.sessionsPerWeek}x por semana  ·  ${plan.weeks} semanas`,
      `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    ],
  });

  const margin = doc.page.margins.left;
  const widths = [150, 42, 64, 52, 52, 168];
  const headers = ["Exercício", "Séries", "Reps", "Desc.", "Cad.", "Orientação"];
  const tableWidth = widths.reduce((a, b) => a + b, 0);

  const drawTableHeader = () => {
    const top = doc.y;
    doc.save();
    doc.roundedRect(margin, top, tableWidth, 18, 3).fill(PDF_BRAND.soft);
    headers.forEach((header, index) => {
      const x = margin + widths.slice(0, index).reduce((a, b) => a + b, 0);
      doc.fillColor(PDF_BRAND.primaryStrong).font("Helvetica-Bold").fontSize(7.5).text(header, x + 4, top + 5, { width: widths[index] - 6 });
    });
    doc.restore();
    doc.x = margin;
    doc.y = top + 22;
  };

  for (const day of plan.days) {
    pdfSectionTitle(doc, `${day.day} — ${day.focus}`);
    doc.fillColor(PDF_BRAND.muted).font("Helvetica").fontSize(8).text(`Aquecimento: ${day.warmup.join("; ")}`, margin);
    doc.moveDown(0.35);
    drawTableHeader();

    for (const exercise of day.exercises) {
      if (doc.y > doc.page.height - 90) {
        doc.addPage();
        doc.x = margin;
        drawTableHeader();
      }
      const y = doc.y;
      const cells = [
        exercise.name,
        String(exercise.sets),
        exercise.reps,
        `${exercise.restSeconds}s`,
        exercise.tempo,
        `${exercise.rir} RIR. ${exercise.instructions[0] ?? exercise.notes}`,
      ];
      cells.forEach((cell, index) => {
        doc.fillColor(index === 0 ? PDF_BRAND.ink : PDF_BRAND.muted).font(index === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(7.5)
          .text(cell, margin + widths.slice(0, index).reduce((a, b) => a + b, 0) + 4, y, { width: widths[index] - 6, height: 36 });
      });
      doc.x = margin;
      doc.y = y + 44;
      doc.save().strokeColor(PDF_BRAND.line).lineWidth(0.4).moveTo(margin, y + 40).lineTo(margin + tableWidth, y + 40).stroke().restore();
    }
    doc.moveDown(0.5);
  }

  pdfSectionTitle(doc, "Progressão e segurança");
  doc.fillColor(PDF_BRAND.ink).font("Helvetica").fontSize(9).text(`Progressão: ${plan.progressionRule}`, margin);
  doc.moveDown(0.2);
  doc.text(`Deload: ${plan.deloadRule}`, margin);
  doc.moveDown(0.2);
  doc.fillColor(PDF_BRAND.muted).text("Interrompa em caso de dor aguda, tontura, formigamento, perda súbita de força ou falha de equipamento.", margin);

  return { buffer: await docToBuffer(doc, chunks, "Ficha de treino Sistema Fitness. Respeite a técnica e a recuperação; não substitui orientação profissional."), filename: "sistema-fitness-ficha-treino.pdf", contentType: "application/pdf" };
}

export async function buildProgressoPdf(userId: string): Promise<BuiltFile> {
  const prisma = getPrisma();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
  const [measurements, workouts, meals, water] = await Promise.all([
    prisma.bodyMeasurement.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 8 }),
    prisma.workoutSession.findMany({ where: { userId }, orderBy: { startedAt: "desc" }, take: 8 }),
    prisma.mealLog.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 8 }),
    prisma.waterLog.findMany({ where: { userId }, orderBy: { loggedAt: "desc" }, take: 20 }),
  ]);

  const { doc, chunks } = createBrandedPdf({
    title: "Relatório de evolução",
    meta: [`Aluno: ${user.name}`, `Gerado em: ${new Date().toLocaleString("pt-BR")}`],
  });

  pdfSectionTitle(doc, "Medidas recentes");
  if (measurements.length === 0) doc.fillColor(PDF_BRAND.muted).font("Helvetica").fontSize(10).text("Nenhuma medida registrada ainda.");
  for (const item of measurements) {
    doc.fillColor(PDF_BRAND.ink).font("Helvetica").fontSize(10).text(`${item.date.toLocaleDateString("pt-BR")}  —  ${item.weightKg} kg, cintura ${item.waistCm ?? "-"} cm, gordura ${item.bodyFatPct ?? "-"}%`);
  }

  pdfSectionTitle(doc, "Treinos registrados");
  if (workouts.length === 0) doc.fillColor(PDF_BRAND.muted).font("Helvetica").fontSize(10).text("Nenhum treino concluído ainda.");
  for (const item of workouts) {
    doc.fillColor(PDF_BRAND.ink).font("Helvetica").fontSize(10).text(`${item.startedAt.toLocaleDateString("pt-BR")}  —  ${item.workoutName}, volume ${item.totalVolumeKg} kg`);
  }

  pdfSectionTitle(doc, "Nutrição e hidratação");
  doc.fillColor(PDF_BRAND.ink).font("Helvetica").fontSize(10).text(`Refeições registradas: ${meals.length}`);
  doc.text(`Água registrada nos últimos lançamentos: ${water.reduce((sum, item) => sum + item.amountMl, 0)} ml`);

  return { buffer: await docToBuffer(doc, chunks, "Relatório de acompanhamento Sistema Fitness. Mostra tendências e não promete resultados."), filename: "sistema-fitness-relatorio.pdf", contentType: "application/pdf" };
}

export async function buildDataExportJson(userId: string): Promise<BuiltFile> {
  const prisma = getPrisma();
  const data = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, name: true, createdAt: true,
      profile: true, consents: true, measurements: true,
      workoutPlans: true, nutritionPlans: true,
      workoutSessions: { include: { sets: true } },
      mealLogs: true, waterLogs: true, sleepLogs: true, habitLogs: true,
      reminders: true, notifications: true,
    },
  });
  await prisma.dataExport.create({ data: { userId, status: "ready" } });
  const payload = JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2);
  return { buffer: Buffer.from(payload, "utf-8"), filename: "sistema-fitness-meus-dados.json", contentType: "application/json" };
}
