import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireCompany } from "@/lib/auth/company";
import type { QuoteStatus } from "@/types/database";

export async function getQuotes(status?: QuoteStatus) {
  const membership = await requireCompany();
  const supabase = await createClient();
  const [{ data: quotes }, { data: clients }] = await Promise.all([
    (status ? supabase.from("quotes").select("*").eq("company_id", membership.company_id).eq("status", status) : supabase.from("quotes").select("*").eq("company_id", membership.company_id)).order("issued_at", { ascending: false }),
    supabase.from("clients").select("id, name, responsible_name").eq("company_id", membership.company_id),
  ]);
  const clientNames = new Map((clients ?? []).map((client) => [client.id, client]));
  return (quotes ?? []).map((quote) => ({ ...quote, client: clientNames.get(quote.client_id) ?? null }));
}

export async function getQuote(id: string) {
  const membership = await requireCompany();
  const supabase = await createClient();
  const { data: quote } = await supabase.from("quotes").select("*").eq("id", id).eq("company_id", membership.company_id).maybeSingle();
  if (!quote) return null;
  const [{ data: client }, { data: items }, { data: equipment }, { data: photoLinks }, { data: company }, { data: visit }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", quote.client_id).eq("company_id", membership.company_id).maybeSingle(),
    supabase.from("quote_items").select("*").eq("quote_id", id).order("line_number"),
    supabase.from("equipment").select("id, name, brand, model").eq("company_id", membership.company_id),
    supabase.from("quote_photos").select("photo_id").eq("quote_id", id),
    supabase.from("companies").select("*").eq("id", membership.company_id).maybeSingle(),
    quote.service_visit_id ? supabase.from("service_visits").select("*").eq("id", quote.service_visit_id).eq("company_id", membership.company_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const equipmentById = new Map((equipment ?? []).map((item) => [item.id, item]));
  const photoIds = (photoLinks ?? []).map((item) => item.photo_id);
  const { data: photos } = photoIds.length ? await supabase.from("service_photos").select("*").in("id", photoIds).eq("company_id", membership.company_id) : { data: [] };
  const { data: visitItems } = quote.service_visit_id ? await supabase.from("service_visit_items").select("*").eq("visit_id", quote.service_visit_id) : { data: [] };
  return { quote, client, company, visit, visitItems: visitItems ?? [], items: (items ?? []).map((item) => ({ ...item, equipment: item.equipment_id ? equipmentById.get(item.equipment_id) ?? null : null })), photos: photos ?? [] };
}
