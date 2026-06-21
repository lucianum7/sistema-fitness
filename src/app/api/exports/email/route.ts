import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonOk, handleRouteError } from "@/lib/server/api";
import { requireApiUser } from "@/lib/server/api-auth";
import { exportReadyEmail } from "@/lib/server/email-templates";
import { sendTransactionalEmail } from "@/lib/server/mail";
import { buildCardapioPdf, buildDataExportJson, buildFichaPdf, buildProgressoPdf } from "@/lib/server/pdf-exports";

export const runtime = "nodejs";

const schema = z.object({
  type: z.enum(["cardapio", "ficha", "progresso", "dados"]),
  range: z.enum(["weekly", "monthly"]).default("weekly"),
});

const labels: Record<z.infer<typeof schema>["type"], string> = {
  cardapio: "Seu cardápio em PDF",
  ficha: "Sua ficha de treino em PDF",
  progresso: "Seu relatório de evolução em PDF",
  dados: "Seus dados exportados",
};

// Gera o artefato pedido e ENVIA por e-mail (anexo) ao próprio aluno.
export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser();
    const input = schema.parse(await request.json().catch(() => ({})));

    const file = input.type === "cardapio"
      ? await buildCardapioPdf(user.id, input.range)
      : input.type === "ficha"
        ? await buildFichaPdf(user.id)
        : input.type === "progresso"
          ? await buildProgressoPdf(user.id)
          : await buildDataExportJson(user.id);

    const mail = exportReadyEmail(user.name, labels[input.type]);
    await sendTransactionalEmail({
      userId: user.id,
      to: user.email,
      ...mail,
      attachments: [{ filename: file.filename, content: file.buffer }],
    });

    return jsonOk({ sent: true, to: user.email });
  } catch (error) {
    return handleRouteError(error);
  }
}
