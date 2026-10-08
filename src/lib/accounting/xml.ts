export const MAX_NFE_XML_BYTES = 10 * 1024 * 1024;
export type ParsedNfeItem = { supplierCode: string | null; description: string; ncm: string | null; cfop: string | null; unit: string | null; quantity: number; unitCost: number; totalCost: number; taxes: Record<string, string> };
export type ParsedNfe = { accessKey: string; number: string | null; series: string | null; issueDate: string | null; supplierDocument: string | null; supplierName: string | null; recipientDocument: string | null; totalAmount: number; items: ParsedNfeItem[] };
function text(xml: string, tag: string, scope = xml) { const match = scope.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i")); return match?.[1]?.replace(/<[^>]+>/g, "").trim() || null; }
function blocks(xml: string, tag: string) { return [...xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "gi"))].map((match) => match[1]); }
function money(value: string | null) { const parsed = Number((value ?? "0").replace(",", ".")); return Number.isFinite(parsed) ? parsed : 0; }
export function parseNfeXml(xml: string): ParsedNfe {
  if (typeof xml !== "string" || new TextEncoder().encode(xml).byteLength > MAX_NFE_XML_BYTES) throw new Error("Arquivo XML excede o limite permitido.");
  if (/(<!DOCTYPE|<!ENTITY|\bSYSTEM\b|\bPUBLIC\b)/i.test(xml)) throw new Error("XML rejeitado por conter declarações inseguras.");
  const inf = xml.match(/<infNFe[^>]*\bid\s*=\s*["']NFe(\d{44})["']/i)?.[1] ?? text(xml, "chNFe");
  if (!inf || !/^\d{44}$/.test(inf)) throw new Error("XML sem chave de acesso NF-e válida.");
  const details = blocks(xml, "det");
  const emit = xml.match(/<emit[\s\S]*?<\/emit>/i)?.[0] ?? "";
  const dest = xml.match(/<dest[\s\S]*?<\/dest>/i)?.[0] ?? "";
  return { accessKey: inf, number: text(xml, "nNF"), series: text(xml, "serie"), issueDate: text(xml, "dhEmi") ?? text(xml, "dEmi"), supplierDocument: text(xml, "CNPJ", emit), supplierName: text(xml, "xNome", emit), recipientDocument: text(xml, "CNPJ", dest), totalAmount: money(text(xml, "vNF")), items: details.map((detail) => { const prod = detail.match(/<prod[\s\S]*?<\/prod>/i)?.[0] ?? detail; return { supplierCode: text(prod, "cProd"), description: text(prod, "xProd") ?? "Item sem descrição", ncm: text(prod, "NCM"), cfop: text(prod, "CFOP"), unit: text(prod, "uCom"), quantity: money(text(prod, "qCom")), unitCost: money(text(prod, "vUnCom")), totalCost: money(text(prod, "vProd")), taxes: {} }; }) };
}
export function weightedAverageCost(oldQuantity: number, oldCost: number, incomingQuantity: number, incomingCost: number) { const total = oldQuantity + incomingQuantity; return total > 0 ? ((oldQuantity * oldCost) + (incomingQuantity * incomingCost)) / total : incomingCost; }
