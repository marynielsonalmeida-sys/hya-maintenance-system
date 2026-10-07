import Link from "next/link";
import { requireCompany } from "@/lib/auth/company";

const labels: Record<string, string> = { clientes: "Clientes", equipamentos: "Equipamentos", chamados: "Chamados", ordens: "Ordens de Serviço", tecnicos: "Técnicos", pecas: "Peças", financeiro: "Financeiro", relatorios: "Relatórios", configuracoes: "Configurações" };

export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  await requireCompany();
  const { module } = await params;
  const label = labels[module] ?? "Módulo";
  return <section className="rounded-2xl border border-white/10 bg-[#0d1a20] p-6 sm:p-8"><p className="font-mono text-xs uppercase tracking-[0.18em] text-teal-300">Módulo preparado</p><h1 className="mt-3 text-3xl font-semibold text-white">{label}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">Esta área está protegida por empresa e será implementada na próxima fase. Nenhum dado fictício foi criado.</p><Link href="/dashboard" className="mt-6 inline-flex text-sm font-semibold text-teal-300 hover:text-teal-200">Voltar ao dashboard →</Link></section>;
}
