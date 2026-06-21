import PDFDocument from "pdfkit/js/pdfkit.standalone.js";

type Doc = PDFKit.PDFDocument;

// Paleta da marca Sistema Fitness (mesma do app).
export const PDF_BRAND = {
  primary: "#0f8f6a",
  primaryStrong: "#08654d",
  ink: "#171918",
  muted: "#6f7872",
  line: "#e2e7df",
  soft: "#f1f5ef",
  band: "#dff3ec",
};

const MARGIN = 48;

// Cria um PDF já com o cabeçalho branded desenhado e o coletor de chunks pronto.
export function createBrandedPdf(options: { title: string; subtitle?: string; meta?: string[] }) {
  const doc: Doc = new PDFDocument({ margin: MARGIN, size: "A4", bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
  drawHeader(doc, options);
  return { doc, chunks };
}

function drawHeader(doc: Doc, { title, subtitle, meta }: { title: string; subtitle?: string; meta?: string[] }) {
  const width = doc.page.width;
  doc.save();
  doc.rect(0, 0, width, 90).fill(PDF_BRAND.primary);
  doc.rect(0, 90, width, 4).fill(PDF_BRAND.primaryStrong);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(25).text("Sistema Fitness", MARGIN, 28);
  doc.fillColor(PDF_BRAND.band).font("Helvetica").fontSize(9.5).text("Treino · Dieta · Evolução", MARGIN, 60);
  doc.restore();

  doc.y = 116;
  doc.fillColor(PDF_BRAND.ink).font("Helvetica-Bold").fontSize(19).text(title, MARGIN);
  if (subtitle) {
    doc.moveDown(0.2);
    doc.fillColor(PDF_BRAND.muted).font("Helvetica").fontSize(10.5).text(subtitle, MARGIN);
  }
  if (meta?.length) {
    doc.moveDown(0.3);
    for (const line of meta) {
      doc.fillColor(PDF_BRAND.muted).font("Helvetica").fontSize(9).text(line, MARGIN);
    }
  }
  doc.moveDown(0.7);
  const lineY = doc.y;
  doc.save().strokeColor(PDF_BRAND.line).lineWidth(1).moveTo(MARGIN, lineY).lineTo(width - MARGIN, lineY).stroke().restore();
  doc.moveDown(0.7);
  doc.fillColor(PDF_BRAND.ink).font("Helvetica");
}

// Título de seção em destaque (cor primária).
export function pdfSectionTitle(doc: Doc, text: string) {
  if (doc.y + 48 > doc.page.height - 64) doc.addPage();
  doc.moveDown(0.5);
  doc.fillColor(PDF_BRAND.primary).font("Helvetica-Bold").fontSize(14).text(text, MARGIN);
  doc.moveDown(0.25);
  doc.fillColor(PDF_BRAND.ink).font("Helvetica");
}

// Faixa de "chips" com as metas (linha destacada).
export function pdfMetaStrip(doc: Doc, text: string) {
  const width = doc.page.width;
  const top = doc.y;
  doc.save();
  doc.roundedRect(MARGIN, top, width - MARGIN * 2, 26, 6).fill(PDF_BRAND.soft);
  doc.fillColor(PDF_BRAND.primaryStrong).font("Helvetica-Bold").fontSize(9.5).text(text, MARGIN + 12, top + 8, { width: width - MARGIN * 2 - 24 });
  doc.restore();
  doc.y = top + 34;
  doc.fillColor(PDF_BRAND.ink).font("Helvetica");
}

// Adiciona rodapé (marca + paginação) em todas as páginas e fecha o documento.
export function finalizePdf(doc: Doc, disclaimer: string) {
  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    const width = doc.page.width;
    const height = doc.page.height;
    doc.save();
    doc.strokeColor(PDF_BRAND.line).lineWidth(0.5).moveTo(MARGIN, height - 40).lineTo(width - MARGIN, height - 40).stroke();
    doc.fillColor(PDF_BRAND.muted).font("Helvetica").fontSize(7.5);
    doc.text(disclaimer, MARGIN, height - 32, { width: width - MARGIN * 2 - 70, align: "left", lineBreak: false });
    doc.text(`Página ${index + 1}/${range.count}`, width - MARGIN - 70, height - 32, { width: 70, align: "right", lineBreak: false });
    doc.restore();
  }
  doc.end();
}

// Monta a Response HTTP do PDF.
export async function pdfResponse(doc: Doc, chunks: Buffer[], filename: string) {
  await new Promise<void>((resolve) => doc.on("end", resolve));
  return new Response(Buffer.concat(chunks), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  });
}
