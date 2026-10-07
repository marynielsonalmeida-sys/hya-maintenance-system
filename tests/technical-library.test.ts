import assert from "node:assert/strict";
import test from "node:test";
import { technicalLibraryMatches } from "../src/lib/technical-library/search";
import { hasTechnicalSource, provenanceLabel, provenanceSource } from "../src/lib/technical-library/provenance";
import { readFileSync } from "node:fs";

test("busca encontra modelo por nome ou código", () => {
  assert.equal(technicalLibraryMatches("RT250", ["Movement RT250", "RT250"]), true);
  assert.equal(technicalLibraryMatches("XSF", ["Movement RT250", "RT250"]), false);
});

test("busca encontra peça por especificação", () => {
  assert.equal(technicalLibraryMatches("4PK", ["Correia", "COR-01"], { correia: "4PK XXX" }), true);
  assert.equal(technicalLibraryMatches("6205", ["Rolamento 6203", null]), false);
});

test("busca vazia não elimina registros", () => {
  assert.equal(technicalLibraryMatches("", ["Qualquer peça"]), true);
});

test("oficial só recebe selo oficial quando há fonte", () => {
  assert.equal(hasTechnicalSource({ source_document_id: "doc-1", source_page: "37", source_url: null, source_notes: null }), true);
  assert.equal(provenanceLabel("OFFICIAL_MANUFACTURER", { source_document_id: "doc-1", source_page: null, source_url: null, source_notes: null }), "Fonte oficial do fabricante");
  assert.equal(provenanceLabel("OFFICIAL_MANUFACTURER", { source_document_id: null, source_page: null, source_url: null, source_notes: null }), "Não verificado");
});

test("proveniência de campo, não verificada e página são exibidas", () => {
  assert.equal(provenanceLabel("FIELD_VERIFIED", { source_document_id: null, source_page: null, source_url: null, source_notes: null }), "Verificado em campo");
  assert.equal(provenanceLabel("UNVERIFIED", { source_document_id: null, source_page: null, source_url: null, source_notes: null }), "Não verificado");
  assert.equal(provenanceSource({ source_document_id: "doc-1", source_page: "37", source_url: null, source_notes: null }), "Documento · página 37");
});

test("migration rejeita oficial sem fonte e mantém isolamento por empresa", () => {
  const migration = readFileSync("supabase/migrations/0006_technical_provenance.sql", "utf8");
  assert.match(migration, /OFFICIAL_SOURCE_REQUIRED/);
  assert.match(migration, /technical_specifications_read[\s\S]*is_company_member\(company_id\)/);
  assert.match(migration, /technical_specifications_write[\s\S]*can_manage_company\(company_id\)/);
  assert.match(migration, /SOURCE_COMPANY_MISMATCH/);
});
