export type QuoteCalculationItem = { quantity: number; unit_price: number };

export function calculateQuoteTotals(items: QuoteCalculationItem[], discount: number) {
  const subtotal = items.reduce((sum, item) => sum + Math.max(0, item.quantity) * Math.max(0, item.unit_price), 0);
  const safeDiscount = Math.min(Math.max(0, discount), subtotal);
  return { subtotal: Number(subtotal.toFixed(2)), discount: Number(safeDiscount.toFixed(2)), total: Number((subtotal - safeDiscount).toFixed(2)) };
}

export function formatQuoteCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
