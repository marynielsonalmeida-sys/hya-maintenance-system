import "server-only";

import { requireCompany } from "@/lib/auth/company";
import { createClient } from "@/lib/supabase/server";

type LooseRow = Record<string, unknown>;
type ListRow = { id: string; client_id: string; assigned_technician_id: string | null; status: string; created_at: string; clients: { name: string } | null; profiles: { full_name: string } | null };
type DetailOrder = { id: string; company_id: string; client_id: string; assigned_technician_id: string | null; quote_id: string | null; status: string; started_at: string | null; finished_at: string | null; clients: { name: string; responsible_name?: string | null; phone?: string | null; email?: string | null } | null; profiles: { full_name: string } | null };
type EquipmentRow = { equipment_id: string; equipment: { id: string; name: string; brand: string | null; model: string | null; serial_number?: string | null } | null; diagnosis: string | null; problem_description: string | null; service_performed: string | null; technical_notes: string | null };
type ExecutionRow = { id: string; equipment_id: string | null; description: string; quantity: number; unit: string; action: string };
type PhotoRow = { id: string; equipment_id: string | null; type: string; storage_path: string };
type QuoteRow = { id: string; quote_number: string; total: number; status: string };

export async function getWorkOrders(status?: string): Promise<ListRow[]> {
  const membership = await requireCompany();
  const supabase = await createClient();
  // The generated Database type does not describe PostgREST's dynamic query builder.
  // Keep this cast local to the query adapter; all filters still include company_id.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  let query = db
    .from("work_orders")
    .select("*")
    .eq("company_id", membership.company_id)
    .order("created_at", { ascending: false });
  if (status && ["DRAFT", "SCHEDULED", "IN_PROGRESS", "WAITING_PARTS", "COMPLETED", "CANCELLED"].includes(status)) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) {
    console.error("[work-order] list failed", { code: error.code, message: error.message, companyId: membership.company_id });
    return [];
  }
  const orders = data ?? [];
  const clientIds = [...new Set(orders.map((order: LooseRow) => order.client_id).filter(Boolean))];
  const profileIds = [...new Set(orders.map((order: LooseRow) => order.assigned_technician_id).filter(Boolean))];
  const [{ data: clients }, { data: profiles }] = await Promise.all([
    clientIds.length ? db.from("clients").select("id, name").in("id", clientIds).eq("company_id", membership.company_id) : Promise.resolve({ data: [] }),
    profileIds.length ? db.from("profiles").select("id, full_name").in("id", profileIds) : Promise.resolve({ data: [] }),
  ]);
  const clientsById = new Map((clients ?? []).map((client: LooseRow) => [client.id, client]));
  const profilesById = new Map((profiles ?? []).map((profile: LooseRow) => [profile.id, profile]));
  return orders.map((order: LooseRow) => ({ ...order, clients: clientsById.get(order.client_id as string) ?? null, profiles: profilesById.get(order.assigned_technician_id as string) ?? null })) as ListRow[];
}

export async function getWorkOrder(id: string): Promise<{ workOrder: DetailOrder; equipment: EquipmentRow[]; executionItems: ExecutionRow[]; photos: PhotoRow[]; quote: QuoteRow | null } | null> {
  const membership = await requireCompany();
  const supabase = await createClient();
  // See the list adapter above: nested dynamic selects are intentionally isolated here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { data: workOrder, error } = await db
    .from("work_orders")
    .select("*")
    .eq("id", id)
    .eq("company_id", membership.company_id)
    .maybeSingle();
  if (error) {
    console.error("[work-order] detail failed", { code: error.code, message: error.message, workOrderId: id, companyId: membership.company_id });
    return null;
  }
  if (!workOrder) return null;
  const [equipmentResult, itemsResult, photosResult, quoteResult, clientResult, profileResult] = await Promise.all([
    db.from("work_order_equipment").select("*").eq("work_order_id", id),
    db.from("work_order_execution_items").select("*").eq("work_order_id", id).order("created_at", { ascending: false }),
    db.from("work_order_photos").select("*").eq("work_order_id", id).order("created_at", { ascending: false }),
    workOrder.quote_id ? db.from("quotes").select("id, quote_number, total, status").eq("id", workOrder.quote_id).eq("company_id", membership.company_id).maybeSingle() : Promise.resolve({ data: null }),
    db.from("clients").select("*").eq("id", workOrder.client_id).eq("company_id", membership.company_id).maybeSingle(),
    workOrder.assigned_technician_id ? db.from("profiles").select("id, full_name").eq("id", workOrder.assigned_technician_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const equipmentIds = (equipmentResult.data ?? []).map((item: LooseRow) => item.equipment_id).filter(Boolean);
  const { data: equipmentRows } = equipmentIds.length ? await db.from("equipment").select("id, name, brand, model").in("id", equipmentIds).eq("company_id", membership.company_id) : { data: [] };
  const equipmentById = new Map((equipmentRows ?? []).map((equipment: LooseRow) => [equipment.id, equipment]));
  return {
    workOrder: { id: workOrder.id, company_id: workOrder.company_id, client_id: workOrder.client_id, assigned_technician_id: workOrder.assigned_technician_id, quote_id: workOrder.quote_id ?? null, status: workOrder.status, started_at: workOrder.started_at ?? null, finished_at: workOrder.finished_at ?? null, clients: clientResult.data ?? null, profiles: profileResult.data ?? null },
    equipment: (equipmentResult.data ?? []).map((item: LooseRow) => ({ equipment_id: item.equipment_id as string, equipment: equipmentById.get(item.equipment_id as string) ?? null, diagnosis: item.diagnosis as string | null, problem_description: item.problem_description as string | null, service_performed: item.service_performed as string | null, technical_notes: item.technical_notes as string | null })) as EquipmentRow[],
    executionItems: (itemsResult.data ?? []) as ExecutionRow[],
    photos: (photosResult.data ?? []) as PhotoRow[],
    quote: quoteResult.data as QuoteRow | null,
  };
}
