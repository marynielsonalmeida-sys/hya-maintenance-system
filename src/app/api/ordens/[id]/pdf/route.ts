import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { NextResponse } from "next/server";
import { getWorkOrder } from "@/lib/field-service/orders";
import { getCompanyLogoUrl } from "@/lib/company/settings";
import { requireCompany } from "@/lib/auth/company";
import { createClient } from "@/lib/supabase/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const membership = await requireCompany();
  const data = await getWorkOrder(id);
  if (!data || data.workOrder.company_id && data.workOrder.company_id !== membership.company_id) return NextResponse.json({ error: "Ordem não encontrada." }, { status: 404 });
  const supabase = await createClient();
  const { data: company } = await supabase.from("companies").select("*").eq("id", membership.company_id).maybeSingle();
  if (!company) return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 800;
  const teal = rgb(0.08, 0.45, 0.42);
  const ink = rgb(0.1, 0.14, 0.16);
  const muted = rgb(0.35, 0.4, 0.44);
  const draw = (text: string, size = 10, color = ink, useBold = false) => { page.drawText(text.slice(0, 110), { x: 40, y, size, font: useBold ? bold : font, color }); y -= size + 7; if (y < 55) { page = pdf.addPage([595, 842]); y = 800; } };
  const line = () => { page.drawLine({ start: { x: 40, y: y + 3 }, end: { x: 555, y: y + 3 }, thickness: 0.7, color: rgb(0.85, 0.88, 0.88) }); y -= 12; };
  const formatDate = (value: string | null | undefined) => value ? new Date(value).toLocaleString("pt-BR") : "—";
  const companyName = company.commercial_name || company.name;
  const logoUrl = await getCompanyLogoUrl(company.logo_path);
  if (logoUrl) {
    try {
      const response = await fetch(logoUrl);
      if (response.ok) {
        const bytes = await response.arrayBuffer();
        const image = response.headers.get("content-type")?.includes("png") ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        const scale = Math.min(120 / image.width, 48 / image.height);
        page.drawImage(image, { x: 40, y: 785, width: image.width * scale, height: image.height * scale });
      }
    } catch {
      // PDF continues with the company-name fallback when logo retrieval fails.
    }
  }
  page.drawText(companyName, { x: 180, y: 805, size: 18, font: bold, color: teal });
  page.drawText("RELATÓRIO TÉCNICO", { x: 180, y: 783, size: 11, font: bold, color: muted });
  y = 735;
  draw(`OS Nº ${id.slice(0, 8).toUpperCase()}`, 15, ink, true);
  draw(`Status: ${data.workOrder.status === "COMPLETED" ? "SERVIÇO CONCLUÍDO" : data.workOrder.status}`, 10, teal, true);
  draw(`Prestador: ${companyName} · CPF/CNPJ: ${company.document || "—"}`);
  draw(`Contato: ${company.phone || "—"} · WhatsApp: ${company.whatsapp || "—"} · ${company.email || "—"}`);
  draw(`Endereço: ${[company.street || company.address, company.address_number, company.neighborhood, company.city, company.state].filter(Boolean).join(", ") || "—"}`);
  line();
  const client = data.workOrder.clients;
  draw(`Cliente: ${client?.name || "—"} · Responsável: ${client?.responsible_name || "—"}`, 11, ink, true);
  draw(`Telefone: ${client?.phone || "—"} · E-mail: ${client?.email || "—"}`);
  draw(`Técnico: ${data.workOrder.profiles?.full_name || "—"} · Início: ${formatDate(data.workOrder.started_at)} · Fim: ${formatDate(data.workOrder.finished_at)}`);
  draw(`Orçamento relacionado: ${data.quote?.quote_number || "—"}${data.quote ? ` · ${Number(data.quote.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : ""}`);
  line();
  draw("EXECUÇÃO POR EQUIPAMENTO", 12, teal, true);
  for (const item of data.equipment) {
    draw(item.equipment?.name || "Equipamento", 11, ink, true);
    draw(`Marca/modelo: ${[item.equipment?.brand, item.equipment?.model].filter(Boolean).join(" / ") || "—"}`);
    draw(`Diagnóstico: ${item.diagnosis || item.problem_description || "—"}`);
    draw(`Serviço executado: ${item.service_performed || "—"}`);
    draw(`Observações técnicas: ${item.technical_notes || "—"}`);
    const parts = data.executionItems.filter((part) => part.equipment_id === item.equipment_id || !part.equipment_id);
    for (const part of parts) draw(`Peça: ${part.description} · ${part.quantity} ${part.unit} · ${part.action}`);
    const photos = data.photos.filter((photo) => photo.equipment_id === item.equipment_id);
    draw(`Registros fotográficos: ${photos.map((photo) => photo.type).join(", ") || "—"}`, 9, muted);
    line();
  }
  if (!data.equipment.length) draw("Nenhum equipamento vinculado.", 10, muted);
  draw(`Gerado em ${new Date().toLocaleString("pt-BR")} · TecFlow — Gestão Técnica`, 8, muted);
  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="relatorio-tecnico-OS-${id.slice(0, 8)}.pdf"`, "Cache-Control": "private, no-store" } });
}
