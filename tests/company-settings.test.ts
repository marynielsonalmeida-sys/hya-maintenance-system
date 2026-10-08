import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/0011_company_branding_and_settings.sql", "utf8");
const reportRoute = readFileSync("src/app/api/ordens/[id]/pdf/route.ts", "utf8");

test("company settings migration adds address fields and private logo bucket", () => {
  assert.match(migration, /add column if not exists postal_code/);
  assert.match(migration, /company-assets/);
  assert.match(migration, /company_assets_insert/);
  assert.match(migration, /public\.can_manage_company/);
});

test("technical report is derived from the real work order", () => {
  assert.match(reportRoute, /getWorkOrder\(id\)/);
  assert.match(reportRoute, /relatorio-tecnico-OS-/);
  assert.match(reportRoute, /photo\.type/);
  assert.match(reportRoute, /PDFDocument/);
});
