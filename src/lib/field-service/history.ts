import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireCompany } from "@/lib/auth/company";

/**
 * Histórico derivado das entidades operacionais. Não existe uma tabela de
 * histórico duplicada: novas visitas, OS, orçamentos e evidências aparecem
 * automaticamente nas consultas.
 */
export async function getClientHistory(clientId: string) {
  const membership = await requireCompany();
  const supabase = await createClient();
  const companyId = membership.company_id;
  const [visits, requests, workOrders, quotes, photos] = await Promise.all([
    supabase.from("service_visits").select("*").eq("company_id", companyId).eq("client_id", clientId).order("created_at", { ascending: false }),
    supabase.from("service_requests").select("*").eq("company_id", companyId).eq("client_id", clientId).order("opened_at", { ascending: false }),
    supabase.from("work_orders").select("*").eq("company_id", companyId).eq("client_id", clientId).order("created_at", { ascending: false }),
    supabase.from("quotes").select("*").eq("company_id", companyId).eq("client_id", clientId).order("created_at", { ascending: false }),
    supabase.from("service_photos").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
  ]);
  return { visits: visits.data ?? [], requests: requests.data ?? [], workOrders: workOrders.data ?? [], quotes: quotes.data ?? [], photos: photos.data ?? [] };
}

export async function getEquipmentHistory(equipmentId: string) {
  const membership = await requireCompany();
  const supabase = await createClient();
  const companyId = membership.company_id;
  const { data: equipment } = await supabase.from("equipment").select("*").eq("id", equipmentId).eq("company_id", companyId).maybeSingle();
  if (!equipment) return null;

  const { data: visitItems } = await supabase.from("service_visit_items").select("*").eq("equipment_id", equipmentId);
  const visitIds = (visitItems ?? []).map((item) => item.visit_id);
  const [photos, workOrders] = await Promise.all([
    supabase.from("service_photos").select("*").eq("company_id", companyId).eq("equipment_id", equipmentId).order("created_at", { ascending: false }),
    supabase.from("work_order_equipment").select("*").eq("equipment_id", equipmentId),
  ]);
  const visits = visitIds.length ? await supabase.from("service_visits").select("*").eq("company_id", companyId).in("id", visitIds).order("created_at", { ascending: false }) : { data: [] };
  return { equipment, visitItems: visitItems ?? [], visits: visits.data ?? [], workOrders: workOrders.data ?? [], photos: photos.data ?? [] };
}
