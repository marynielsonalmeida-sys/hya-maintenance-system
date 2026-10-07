import type { ProvenanceFields } from "@/types/database";
import { provenanceLabel, provenanceSource } from "@/lib/technical-library/provenance";

export function ProvenanceBadge({ value }: { value: Pick<ProvenanceFields, "confidence_status" | "source_document_id" | "source_page" | "source_url" | "source_notes"> }) {
  const label = provenanceLabel(value.confidence_status, value);
  const tone = label === "Fonte oficial do fabricante" ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" : label === "Verificado em campo" ? "border-amber-300/30 bg-amber-300/10 text-amber-200" : "border-white/15 bg-white/5 text-slate-300";
  return <span className={`inline-flex max-w-full flex-wrap items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${tone}`} title={provenanceSource(value)}>{label}</span>;
}
