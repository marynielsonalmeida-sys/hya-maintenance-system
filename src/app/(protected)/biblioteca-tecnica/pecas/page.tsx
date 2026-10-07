import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { searchTechnicalLibrary } from "@/lib/technical-library/queries";

export const instant = false;

export default async function TechnicalPartsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const result = await searchTechnicalLibrary(params.q ?? "");
  return <div><Link href="/biblioteca-tecnica/modelos" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" />Biblioteca técnica</Link><div className="mb-7"><p className="eyebrow">Catálogo técnico</p><h1 className="mt-2 text-3xl font-semibold text-white">Peças técnicas</h1><p className="mt-2 text-sm text-slate-400">Informação técnica separada de produtos e estoque comercial.</p></div><form className="relative mb-6"><Search className="absolute left-3 top-3 h-5 w-5 text-slate-500" /><input name="q" defaultValue={params.q} placeholder="Buscar peça, código ou especificação" className="input h-12 pl-11 text-base" /></form><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{result.parts.map((part) => <div key={part.id} className="summary-card"><p className="font-semibold text-white">{part.name}</p><p className="mt-1 text-xs text-slate-500">{part.code || "Sem código"} · {part.unit} · {part.part_type}</p><p className="mt-3 text-sm text-slate-300">{part.description || part.manufacturer_reference || "Sem descrição"}</p>{part.specification && JSON.stringify(part.specification) !== "{}" && <pre className="mt-3 overflow-auto rounded bg-black/20 p-2 text-[10px] text-teal-100">{JSON.stringify(part.specification, null, 2)}</pre>}</div>)}</div>{!result.parts.length && <div className="rounded-xl border border-dashed border-white/15 p-10 text-center text-sm text-slate-500">Nenhuma peça técnica encontrada.</div>}</div>;
}
