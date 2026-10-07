import type { ProvenanceFields, TechnicalConfidenceStatus } from "@/types/database";

export function hasTechnicalSource(value: Pick<ProvenanceFields, "source_document_id" | "source_page" | "source_url" | "source_notes">) {
  return Boolean(value.source_document_id || value.source_page || value.source_url || value.source_notes);
}

export function provenanceLabel(status: TechnicalConfidenceStatus, value: Pick<ProvenanceFields, "source_document_id" | "source_page" | "source_url" | "source_notes">) {
  if (status === "OFFICIAL_MANUFACTURER" && hasTechnicalSource(value)) return "Fonte oficial do fabricante";
  if (status === "FIELD_VERIFIED") return "Verificado em campo";
  return "Não verificado";
}

export function provenanceSource(value: Pick<ProvenanceFields, "source_document_id" | "source_page" | "source_url" | "source_notes">) {
  if (value.source_document_id) return `Documento${value.source_page ? ` · página ${value.source_page}` : ""}`;
  if (value.source_url) return "Fonte web";
  if (value.source_notes) return value.source_notes;
  return "Sem fonte associada";
}
