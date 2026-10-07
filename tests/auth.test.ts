import assert from "node:assert/strict";
import test from "node:test";
import { resolvePostAuthDestination, resolveProtectedDestination } from "../src/lib/auth/routing";
import { validateCompanyName, validateRegistration } from "../src/lib/auth/validation";

test("cadastro válido passa e senhas diferentes falham", () => {
  assert.equal(validateRegistration({ fullName: "Marynielson Almeida", email: "user@example.com", password: "secret123", confirmPassword: "secret123" }), null);
  assert.equal(validateRegistration({ fullName: "Marynielson Almeida", email: "user@example.com", password: "secret123", confirmPassword: "different" })?.field, "confirmPassword");
});

test("empresa exige nome", () => {
  assert.equal(validateCompanyName(""), "Informe o nome da empresa.");
  assert.equal(validateCompanyName("HYA Maintenance"), null);
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
