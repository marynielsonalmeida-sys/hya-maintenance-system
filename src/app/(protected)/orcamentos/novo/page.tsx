import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireCompany } from "@/lib/auth/company";
import { createClient } from "@/lib/supabase/server";
import { createQuoteFromVisitAction } from "@/app/actions";

export const instant = false;
export default async function NewQuotePage() {
  const membership = await requireCompany();
  const supabase = await createClient();
  const { data: visits } = await supabase.from("service_visits").select("id, client_id, created_at, type").eq("company_id", membership.company_id).order("created_at", { ascending: false }).limit(30);
  const ids = (visits ?? []).map((visit) => visit.client_id);
  const { data: clients } = ids.length ? await supabase.from("clients").select("id, name").in("id", ids).eq("company_id", membership.company_id) : { data: [] };
  const names = new Map((clients ?? []).map((client) => [client.id, client.name]));
  const { data: photos } = ids.length ? await supabase.from("service_photos").select("id, visit_id, type, storage_path").in("visit_id", (visits ?? []).map((visit) => visit.id)).in("type", ["PROBLEM", "BEFORE"]) : { data: [] };
  const photosByVisit = new Map<string, typeof photos>();
  for (const photo of photos ?? []) photosByVisit.set(photo.visit_id ?? "", [...(photosByVisit.get(photo.visit_id ?? "") ?? []), photo]);
  return <div className="mx-auto max-w-3xl space-y-6"><Link href="/orcamentos" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" />Orçamentos</Link><div><p className="eyebrow">Novo orçamento</p><h1 className="mt-2 text-3xl font-semibold text-white">Escolha uma visita técnica</h1><p className="mt-2 text-sm text-slate-400">Materiais, serviços e diagnósticos serão pré-carregados. Selecione as fotos que irão para o PDF.</p></div><div className="grid gap-3">{(visits ?? []).map((visit) => <form key={visit.id} action={createQuoteFromVisitAction} className="summary-card space-y-4"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-semibold text-white">{names.get(visit.client_id) ?? "Academia"}</p><p className="mt-1 text-xs text-slate-500">{new Date(visit.created_at).toLocaleString("pt-BR")} · {visit.type}</p></div><input type="hidden" name="visitId" value={visit.id} /><input type="hidden" name="photoSelection" value="1" /><button className="button-primary">Gerar orçamento</button></div>{photosByVisit.get(visit.id)?.length ? <div><p className="text-xs uppercase tracking-wider text-slate-500">Fotos problema/antes</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{photosByVisit.get(visit.id)?.map((photo) => <label key={photo.id} className="flex items-center gap-2 rounded-lg border border-white/10 p-2 text-xs text-slate-300"><input type="checkbox" name="photoId" value={photo.id} defaultChecked />{photo.type} · {photo.storage_path.split("/").pop()}</label>)}</div></div> : <p className="text-xs text-slate-500">Sem fotos prioritárias.</p>}</form>)}{!visits?.length && <div className="summary-card text-sm text-slate-500">Nenhuma visita disponível.</div>}</div></div>;
}
