import assert from "node:assert/strict";
import test from "node:test";
import { technicalLibraryMatches } from "../src/lib/technical-library/search";

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
