import { redirect } from "next/navigation";
import { requireCompany } from "@/lib/auth/company";
import { getWorkOrder } from "@/lib/field-service/orders";
import { normalizeCompanyPhone } from "@/lib/auth/validation";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireCompany();
  const { id } = await params;
  const data = await getWorkOrder(id);
  if (!data) redirect("/ordens?error=not-found");
  const phone = normalizeCompanyPhone(data.workOrder.clients?.phone ?? "");
  const message = encodeURIComponent(`Olá, ${data.workOrder.clients?.responsible_name || data.workOrder.clients?.name || ""}.\n\nO serviço realizado na ${data.workOrder.clients?.name || "academia"} foi concluído.\n\nSegue o Relatório Técnico da OS nº ${id.slice(0, 8).toUpperCase()}, contendo os serviços executados, peças trabalhadas e registros antes/depois.\n\nTecFlow`);
  redirect(phone ? `https://wa.me/55${phone}?text=${message}` : `/ordens/${id}?error=phone`);
}
