import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { calculateQuoteTotals, formatQuoteCurrency } from "../src/lib/quotes/calculations";

test("calcula subtotal, desconto e total do orçamento", () => {
  assert.deepEqual(calculateQuoteTotals([{ quantity: 2, unit_price: 100 }, { quantity: 1, unit_price: 50 }], 30), { subtotal: 250, discount: 30, total: 220 });
  assert.equal(formatQuoteCurrency(220), "R$ 220,00");
});

test("migration suporta visita, itens, fotos, peça técnica e isolamento", () => {
  const migration = readFileSync("supabase/migrations/0007_visual_quotes.sql", "utf8");
  assert.match(migration, /service_visit_id/);
  assert.match(migration, /quote_photos/);
  assert.match(migration, /technical_part_id/);
  assert.match(migration, /public\.can_manage_company\(company_id\)/);
  assert.match(migration, /CONVERTED/);
});
