import { handleRouteError } from "@/lib/server/api";
import { requireApiAdmin } from "@/lib/server/api-auth";
import { getPrisma } from "@/lib/server/db";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\r\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Exporta os usuários (não excluídos) em CSV para o admin baixar.
export async function GET() {
  try {
    await requireApiAdmin();
    const users = await getPrisma().user.findMany({
      where: { deletedAt: null },
      include: { subscription: true },
      orderBy: { createdAt: "desc" },
    });

    const header = ["Nome", "E-mail", "Papel", "Ativo", "Plano", "Assinatura", "Vencimento", "Criado em"];
    const rows = users.map((user) => [
      user.name,
      user.email,
      user.role,
      user.isActive ? "sim" : "nao",
      user.subscription?.planName ?? "",
      user.subscription?.status ?? "",
      user.subscription?.currentPeriodEnd ? user.subscription.currentPeriodEnd.toISOString().slice(0, 10) : "",
      user.createdAt.toISOString().slice(0, 10),
    ]);

    // BOM (﻿) para o Excel reconhecer UTF-8; separador ";" é o padrão pt-BR.
    const csv = "﻿" + [header, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
    const filename = `alunos-sistema-fitness-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
