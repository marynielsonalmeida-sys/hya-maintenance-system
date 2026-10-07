import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { requireCompany } from "@/lib/auth/company";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

const filters = [["", "Todas"], ["PREVENTIVE", "Preventivas"], ["CORRECTIVE", "Corretivas"], ["INSPECTION", "Inspeções"], ["INSTALLATION", "Instalações"]];

export default async function VisitsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const membership = await requireCompany();
  const params = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("service_visits").select("*").eq("company_id", membership.company_id).order("created_at", { ascending: false });
  if (params.type) query = query.eq("type", params.type as never);
  const [{ data: visits }, { data: clients }, { data: items }] = await Promise.all([
    query,
    supabase.from("clients").select("id, name").eq("company_id", membership.company_id),
    supabase.from("service_visit_items").select("visit_id, equipment_id").in("visit_id", (await supabase.from("service_visits").select("id").eq("company_id", membership.company_id)).data?.map((visit) => visit.id) ?? []),
  ]);
  const clientNames = new Map((clients ?? []).map((client) => [client.id, client.name]));
  const countByVisit = new Map<string, number>();
  (items ?? []).forEach((item) => countByVisit.set(item.visit_id, (countByVisit.get(item.visit_id) ?? 0) + 1));
  return <div><div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Operação em campo</p><h1 className="mt-2 text-3xl font-semibold text-white">Visitas técnicas</h1><p className="mt-2 text-sm text-slate-400">Atendimentos reais da sua empresa, mais recentes primeiro.</p></div><Link href="/visitas/nova" className="button-primary"><Plus className="h-4 w-4" />Nova visita</Link></div><div className="mb-6 flex gap-2 overflow-x-auto pb-1">{filters.map(([value, label]) => <Link key={label} href={value ? `/visitas?type=${value}` : "/visitas"} className={`shrink-0 rounded-full border px-3 py-2 text-xs ${params.type === value || (!params.type && !value) ? "border-teal-300 bg-teal-300/10 text-teal-100" : "border-white/10 text-slate-400"}`}>{label}</Link>)}</div>{visits?.length ? <div className="grid gap-3 lg:grid-cols-2">{visits.map((visit) => <Link key={visit.id} href={`/visitas/${visit.id}`} className="rounded-xl border border-white/10 bg-[#0d1a20] p-5 transition hover:border-teal-300/40"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-white">{clientNames.get(visit.client_id) ?? "Academia"}</p><p className="mt-1 text-xs text-slate-500">{new Date(visit.created_at).toLocaleDateString("pt-BR")} · {visit.type}</p></div><span className="rounded-full bg-teal-300/10 px-2 py-1 text-[10px] uppercase tracking-wide text-teal-200">{visit.status}</span></div><div className="mt-5 flex items-center gap-2 text-sm text-slate-400"><CalendarDays className="h-4 w-4 text-teal-300" />{countByVisit.get(visit.id) ?? 0} equipamento(s)</div></Link>)}</div> : <div className="rounded-xl border border-dashed border-white/15 p-10 text-center"><p className="font-semibold text-white">Nenhuma visita encontrada</p><p className="mt-2 text-sm text-slate-500">Registre o primeiro atendimento em campo.</p><Link href="/visitas/nova" className="button-primary mt-5">+ Nova visita</Link></div>}</div>;
}
