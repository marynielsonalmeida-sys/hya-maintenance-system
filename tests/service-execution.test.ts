import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync("supabase/migrations/0010_service_execution_history.sql", "utf8");

test("migration cria execução separada sem alterar quote_items", () => {
  assert.match(migration, /create table if not exists public\.work_order_execution_items/);
  assert.match(migration, /add column if not exists quote_id uuid/);
  assert.match(migration, /create unique index if not exists work_orders_quote_unique/);
  assert.doesNotMatch(migration, /alter table public\.quote_items[\s\S]*update/);
});

test("migration cobre ações reais e fotos durante a execução", () => {
  assert.match(migration, /REPLACED/);
  assert.match(migration, /ADJUSTED/);
  assert.match(migration, /INSPECTED/);
  assert.match(migration, /add value if not exists 'DURING'/);
  assert.match(migration, /create or replace function public\.create_work_order_from_quote/);
});

test("migration mantém isolamento e grants da execução", () => {
  assert.match(migration, /public\.is_company_member\(company_id\)/);
  assert.match(migration, /public\.can_access_work_order\(work_order_id\)/);
  assert.match(migration, /grant select, insert, update, delete on public\.work_order_execution_items to authenticated/);
});
