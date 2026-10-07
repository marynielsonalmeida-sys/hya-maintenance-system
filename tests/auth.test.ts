import assert from "node:assert/strict";
import test from "node:test";
import { resolvePostAuthDestination, resolveProtectedDestination } from "../src/lib/auth/routing";
import { formatCompanyTaxId, isValidCnpj, isValidCpf, normalizeCompanyTaxId, validateCompanyName, validateCompanyTaxId, validateRegistration } from "../src/lib/auth/validation";

test("cadastro válido passa e senhas diferentes falham", () => {
  assert.equal(validateRegistration({ fullName: "Marynielson Almeida", email: "user@example.com", password: "secret123", confirmPassword: "secret123" }), null);
  assert.equal(validateRegistration({ fullName: "Marynielson Almeida", email: "user@example.com", password: "secret123", confirmPassword: "different" })?.field, "confirmPassword");
});

test("empresa exige nome", () => {
  assert.equal(validateCompanyName(""), "Informe o nome da empresa.");
  assert.equal(validateCompanyName("HYA Maintenance"), null);
});

test("CPF e CNPJ exigem documento válido e são normalizados", () => {
  assert.equal(validateCompanyTaxId(""), "CPF ou CNPJ é obrigatório");
  assert.equal(isValidCpf("529.982.247-25"), true);
  assert.equal(validateCompanyTaxId("529.982.247-25"), null);
  assert.equal(validateCompanyTaxId("529.982.247-26"), "CPF inválido");
  assert.equal(isValidCnpj("11.222.333/0001-81"), true);
  assert.equal(validateCompanyTaxId("11.222.333/0001-80"), "CNPJ inválido");
  assert.equal(normalizeCompanyTaxId("11.222.333/0001-81"), "11222333000181");
});

test("máscara de CPF e CNPJ acompanha a quantidade de dígitos", () => {
  assert.equal(formatCompanyTaxId("52998224725"), "529.982.247-25");
  assert.equal(formatCompanyTaxId("11222333000181"), "11.222.333/0001-81");
});

test("proteção direciona usuário sem sessão ao login", () => {
  assert.equal(resolveProtectedDestination(false, false), "/login");
});

test("usuário autenticado sem empresa vai ao onboarding", () => {
  assert.equal(resolveProtectedDestination(true, false), "/onboarding");
  assert.equal(resolvePostAuthDestination(false), "/onboarding");
});

test("usuário com empresa vai ao dashboard", () => {
  assert.equal(resolveProtectedDestination(true, true), "/dashboard");
  assert.equal(resolvePostAuthDestination(true), "/dashboard");
});
