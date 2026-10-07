import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getQuote } from "@/lib/quotes/queries";
import { updateQuoteAction } from "@/app/actions";

export const instant = false;
export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getQuote(id);
  if (!data) return <div className="summary-card text-center text-slate-400">Orçamento não encontrado.</div>;
  return <div className="mx-auto max-w-3xl space-y-6"><Link href={`/orcamentos/${id}`} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" />Voltar ao orçamento</Link><div><p className="eyebrow">Editar proposta</p><h1 className="mt-2 text-3xl font-semibold text-white">{data.quote.quote_number}</h1></div><form action={updateQuoteAction} className="summary-card space-y-5"><input type="hidden" name="quoteId" value={id} /><label className="field-label">Desconto<input name="discount" type="number" min="0" step="0.01" defaultValue={data.quote.discount} className="field-input" /></label><label className="field-label">Validade<input name="validUntil" type="date" defaultValue={data.quote.valid_until ?? ""} className="field-input" /></label><label className="field-label">Observações<textarea name="notes" defaultValue={data.quote.notes ?? ""} rows={5} className="field-input" /></label><button className="button-primary">Salvar orçamento</button></form></div>;
}
