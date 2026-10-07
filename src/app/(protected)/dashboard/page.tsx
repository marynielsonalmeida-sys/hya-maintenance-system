import Link from "next/link";
import { Activity, ClipboardList, Cpu, Plus, Users } from "lucide-react";
import { requireCompany, getCurrentProfile } from "@/lib/auth/company";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const membership = await requireCompany();
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const [clients, equipment, requests, orders] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("company_id", membership.company_id),
    supabase.from("equipment").select("id", { count: "exact", head: true }).eq("company_id", membership.company_id),
    supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("company_id", membership.company_id).in("status", ["OPEN", "IN_PROGRESS", "WAITING"]),
    supabase.from("work_orders").select("id", { count: "exact", head: true }).eq("company_id", membership.company_id).in("status", ["SCHEDULED", "IN_PROGRESS", "WAITING_PARTS"]),
  ]);
  const cards = [
    ["Clientes", clients.count ?? 0, Users], ["Equipamentos", equipment.count ?? 0, Cpu], ["Chamados abertos", requests.count ?? 0, Activity], ["Ordens em andamento", orders.count ?? 0, ClipboardList],
  ] as const;
  return <div><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-xs uppercase tracking-[0.2em] text-teal-300">Visão operacional</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Olá, {profile?.full_name ?? "usuário"}</h1><p className="mt-2 text-sm text-slate-400">{membership.company.name} · acesso {membership.role_code}</p></div><Link href="/visitas/nova" className="button-primary"><Plus className="h-4 w-4" />Nova visita</Link></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, Icon]) => <div key={label} className="rounded-xl border border-white/10 bg-[#0d1a20] p-5"><Icon className="h-5 w-5 text-teal-300" /><p className="mt-6 text-sm text-slate-400">{label}</p><p className="mt-1 text-3xl font-semibold text-white">{value}</p></div>)}</div><section className="mt-6 rounded-xl border border-dashed border-teal-300/25 bg-teal-300/5 p-6"><p className="font-mono text-xs uppercase tracking-[0.16em] text-teal-300">Próximo passo</p><h2 className="mt-2 text-lg font-semibold text-white">Sua operação está pronta para começar.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Cadastre suas academias, equipamentos e primeiros chamados pelos módulos do menu. Os registros serão isolados dentro da empresa ativa.</p></section></div>;
}
