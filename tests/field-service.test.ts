import assert from "node:assert/strict";
import test from "node:test";
import { appendDiagnosis, calculateVisitTotal, isCompanyRecordAllowed, toggleSelection, validateVisitDraft } from "../src/lib/field-service/workflow";

test("seleção de cliente e múltiplos equipamentos é determinística", () => {
  assert.deepEqual(toggleSelection([], "client-1"), ["client-1"]);
  assert.deepEqual(toggleSelection(["eq-1"], "eq-2"), ["eq-1", "eq-2"]);
  assert.deepEqual(toggleSelection(["eq-1", "eq-2"], "eq-1"), ["eq-2"]);
});

test("atalho de diagnóstico não apaga edição manual", () => {
  assert.equal(appendDiagnosis("", "Cabo de aço"), "Cabo de aço");
  assert.equal(appendDiagnosis("Ruído no conjunto", "Roldana"), "Ruído no conjunto; Roldana");
});

test("materiais por metro e unidade calculam corretamente", () => {
  assert.equal(calculateVisitTotal([{ quantity: 4.5, unitPrice: 18 }, { quantity: 2, unitPrice: 35 }, { quantity: 4, unitPrice: null }]), 151);
});

test("salvamento exige cliente e equipamento", () => {
  assert.equal(validateVisitDraft("", ["eq-1"]), "CLIENT_REQUIRED");
  assert.equal(validateVisitDraft("client-1", []), "EQUIPMENT_REQUIRED");
  assert.equal(validateVisitDraft("client-1", ["eq-1"]), null);
});

test("isolamento impede registro de outra empresa", () => {
  assert.equal(isCompanyRecordAllowed("company-a", "company-a"), true);
  assert.equal(isCompanyRecordAllowed("company-b", "company-a"), false);
});
