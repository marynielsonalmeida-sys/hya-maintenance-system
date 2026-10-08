import { AccountingHeader } from "@/components/accounting/ui"; import { ProGate } from "@/components/accounting/pro-gate";
export const instant = false;
export default async function EfdReinfPage() { return <><ProGate /><AccountingHeader title="EFD-Reinf" description="Status de uma futura integração fiscal." /><div className="max-w-2xl rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-6 text-sm text-slate-300">A transmissão EFD-Reinf depende de credenciais e adapter oficial. Nenhum envio é simulado.</div></>; }
