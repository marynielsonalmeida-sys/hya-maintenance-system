import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { requireCompany } from "@/lib/auth/company";
import { createClient } from "@/lib/supabase/server";
import { createQuoteFromVisitAction } from "@/app/actions";

export const instant = false;

export default async function VisitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const membership = await requireCompany();
  const { id } = await params;
  const supabase = await createClient();
  const { data: visit } = await supabase.from("service_visits").select("*").eq("id", id).eq("company_id", membership.company_id).maybeSingle();
  if (!visit) return <div className="rounded-xl border border-dashed border-white/15 p-10 text-center"><p className="text-white">Visita não encontrada.</p><Link href="/visitas" className="mt-4 inline-flex text-sm text-teal-300">Voltar às visitas</Link></div>;
  const [{ data: client }, { data: items }, { data: photos }, { data: materials }, { data: services }] = await Promise.all([
    supabase.from("clients").select("id, name, responsible_name, phone").eq("id", visit.client_id).maybeSingle(),
    supabase.from("service_visit_items").select("*").eq("visit_id", id),
    supabase.from("service_photos").select("*").eq("visit_id", id).order("created_at", { ascending: false }),
    supabase.from("service_visit_materials").select("*").eq("visit_id", id),
    supabase.from("service_visit_services").select("*").eq("visit_id", id),
  ]);
  const equipmentIds = (items ?? []).map((item) => item.equipment_id);
  const { data: equipment } = equipmentIds.length ? await supabase.from("equipment").select("id, name, brand, model").in("id", equipmentIds) : { data: [] };
  const equipmentNames = new Map((equipment ?? []).map((item) => [item.id, item.name]));
  return <div className="pb-8"><Link href="/visitas" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" />Voltar às visitas</Link><div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Visita registrada</p><h1 className="mt-2 text-3xl font-semibold text-white">{client?.name ?? "Academia"}</h1><p className="mt-2 text-sm text-slate-400">{new Date(visit.created_at).toLocaleString("pt-BR")} · {visit.type}</p></div><div className="flex flex-wrap items-center gap-3"><span className="inline-flex items-center gap-2 rounded-full border border-teal-300/30 bg-teal-300/10 px-3 py-2 text-xs text-teal-100"><CheckCircle2 className="h-4 w-4" />{visit.status}</span><form action={createQuoteFromVisitAction}><input type="hidden" name="visitId" value={id} /><button className="button-primary">Gerar orçamento</button></form></div></div><div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]"><section className="space-y-5"><div className="summary-card"><p className="eyebrow">Equipamentos e diagnósticos</p><div className="mt-4 space-y-4">{(items ?? []).map((item) => <div key={item.equipment_id} className="border-b border-white/10 pb-4 last:border-0 last:pb-0"><div className="flex justify-between gap-3"><p className="font-semibold text-white">{equipmentNames.get(item.equipment_id) ?? "Equipamento"}</p><span className="text-xs text-teal-200">{item.status}</span></div><p className="mt-2 text-sm text-slate-300">{item.diagnosis || "Sem diagnóstico descrito"}</p><p className="mt-1 text-xs text-slate-500">{item.recommendation || "Sem recomendação"}</p></div>)}</div></div><div className="summary-card"><p className="eyebrow">Fotos</p><p className="mt-3 text-sm text-slate-400">{photos?.length ?? 0} foto(s) vinculada(s) à visita.</p></div></section><aside className="space-y-5"><div className="summary-card"><p className="eyebrow">Materiais</p>{materials?.length ? <div className="mt-3 space-y-2">{materials.map((item) => <p key={item.id} className="text-sm text-slate-300">{item.quantity} {item.unit} · {item.description}</p>)}</div> : <p className="mt-3 text-sm text-slate-500">Nenhum material.</p>}</div><div className="summary-card"><p className="eyebrow">Serviços / mão de obra</p>{services?.length ? <div className="mt-3 space-y-2">{services.map((item) => <p key={item.id} className="text-sm text-slate-300">{item.quantity}x · {item.description}</p>)}</div> : <p className="mt-3 text-sm text-slate-500">Nenhum serviço.</p>}</div></aside></div></div>;
}
