import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getQuote } from "@/lib/quotes/queries";
import { createClient } from "@/lib/supabase/server";

function drawLine(page: ReturnType<PDFDocument["addPage"]>, text: string, x: number, y: number, size = 10, color = rgb(0.12, 0.15, 0.18)) {
  page.drawText(text.slice(0, 110), { x, y, size, color });
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getQuote(id);
  if (!data) return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595, 842]);
  let y = 790;
  page.drawRectangle({ x: 0, y: 780, width: 595, height: 62, color: rgb(0.04, 0.07, 0.1) });
  page.drawText(data.company?.commercial_name || data.company?.name || "Prestador de serviço", { x: 36, y: 812, size: 18, font: bold, color: rgb(1, 1, 1) });
  page.drawText(`ORÇAMENTO ${data.quote.quote_number}`, { x: 36, y: 795, size: 10, font, color: rgb(0.62, 0.86, 0.82) });
  page.drawText(new Date(data.quote.issued_at).toLocaleDateString("pt-BR"), { x: 470, y: 812, size: 9, font, color: rgb(0.8, 0.85, 0.88) });
  y = 750;
  drawLine(page, "CLIENTE", 36, y, 9, rgb(0.2, 0.5, 0.48)); y -= 20;
  drawLine(page, data.client?.name || "Academia", 36, y, 14); y -= 16;
  drawLine(page, `${data.client?.responsible_name || "Responsável não informado"} · ${data.client?.phone || "Sem telefone"}`, 36, y, 10, rgb(0.35, 0.4, 0.44)); y -= 36;
  drawLine(page, `${data.company?.document || ""} · ${data.company?.phone || data.company?.whatsapp || ""} · ${data.company?.email || ""}`, 36, y, 9, rgb(0.35, 0.4, 0.44)); y -= 22;
  drawLine(page, "ESCOPO DO ATENDIMENTO", 36, y, 9, rgb(0.2, 0.5, 0.48)); y -= 22;
  for (const item of data.visitItems) {
    drawLine(page, `Diagnóstico ${item.equipment_id}: ${item.diagnosis || "Não informado"}`, 42, y, 9, rgb(0.28, 0.32, 0.36));
    y -= 15;
  }
  for (const item of data.items) {
    drawLine(page, `${item.description} · ${item.quantity} ${item.unit}`, 42, y, 10, rgb(0.12, 0.15, 0.18));
    drawLine(page, formatMoney(Number(item.total)), 470, y, 10, rgb(0.12, 0.15, 0.18));
    y -= 17;
    if (item.equipment) { drawLine(page, `Equipamento: ${item.equipment.name}${item.equipment.brand ? ` · ${item.equipment.brand}` : ""}${item.equipment.model ? ` · ${item.equipment.model}` : ""}`, 52, y, 8, rgb(0.4, 0.44, 0.48)); y -= 14; }
    if (y < 100) break;
  }
  y -= 14;
  page.drawLine({ start: { x: 36, y }, end: { x: 559, y }, thickness: 0.6, color: rgb(0.8, 0.83, 0.85) }); y -= 24;
  drawLine(page, `Subtotal: ${formatMoney(Number(data.quote.subtotal))}`, 380, y, 10); y -= 18;
  drawLine(page, `Desconto: ${formatMoney(Number(data.quote.discount))}`, 380, y, 10); y -= 22;
  drawLine(page, `TOTAL: ${formatMoney(Number(data.quote.total))}`, 380, y, 15); y -= 32;
  drawLine(page, "OBSERVAÇÕES", 36, y, 9, rgb(0.2, 0.5, 0.48)); y -= 18;
  drawLine(page, data.quote.notes || "Sem observações.", 36, y, 10); y -= 20;
  drawLine(page, `Validade: ${data.quote.valid_until ? new Date(`${data.quote.valid_until}T12:00:00`).toLocaleDateString("pt-BR") : "a combinar"}`, 36, y, 10, rgb(0.35, 0.4, 0.44));
  y -= 34;
  drawLine(page, "FOTOS SELECIONADAS", 36, y, 9, rgb(0.2, 0.5, 0.48)); y -= 18;
  const supabase = await createClient();
  let photoPage = page;
  for (const photo of data.photos) {
    const signed = await supabase.storage.from("service-photos").createSignedUrl(photo.storage_path, 300);
    if (!signed.data?.signedUrl) continue;
    try {
      const imageBytes = await fetch(signed.data.signedUrl).then((response) => response.arrayBuffer());
      const image = photo.storage_path.toLowerCase().endsWith(".png") ? await pdf.embedPng(imageBytes) : await pdf.embedJpg(imageBytes);
      if (y < 160) { y = 790; photoPage = pdf.addPage([595, 842]); drawLine(photoPage, "FOTOS SELECIONADAS", 36, y, 9, rgb(0.2, 0.5, 0.48)); }
      photoPage.drawImage(image, { x: 42, y: y - 70, width: 100, height: 70 });
      drawLine(photoPage, `${photo.type} · ${photo.storage_path.split("/").pop()}`, 155, y - 35, 9, rgb(0.35, 0.4, 0.44));
      y -= 84;
    } catch {
      drawLine(photoPage, `${photo.type} · imagem indisponível`, 42, y, 9, rgb(0.35, 0.4, 0.44));
      y -= 14;
    }
  }
  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${data.quote.quote_number}.pdf"`, "Cache-Control": "private, no-store" } });
}

function formatMoney(value: number) { return `R$ ${value.toFixed(2).replace(".", ",")}`; }
