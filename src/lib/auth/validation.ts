export type AuthFormError = {
  field?: string;
  message: string;
};

export function validateRegistration(input: { fullName: string; email: string; password: string; confirmPassword: string }): AuthFormError | null {
  if (input.fullName.trim().length < 2) return { field: "fullName", message: "Informe seu nome completo." };
  if (!/^\S+@\S+\.\S+$/.test(input.email.trim())) return { field: "email", message: "Informe um e-mail válido." };
  if (input.password.length < 6) return { field: "password", message: "A senha precisa ter pelo menos 6 caracteres." };
  if (input.password !== input.confirmPassword) return { field: "confirmPassword", message: "As senhas não conferem." };
  return null;
}

export function validateCompanyName(name: string): string | null {
  return name.trim().length < 2 ? "Informe o nome da empresa." : null;
}

export function normalizeCompanyTaxId(value: string) {
  return value.replace(/\D/g, "");
}

function hasRepeatedDigits(value: string) {
  return /^([0-9])\1+$/.test(value);
}

export function isValidCpf(value: string) {
  const digits = normalizeCompanyTaxId(value);
  if (digits.length !== 11 || hasRepeatedDigits(digits)) return false;
  let sum = 0;
  for (let index = 0; index < 9; index += 1) sum += Number(digits[index]) * (10 - index);
  let check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== Number(digits[9])) return false;
  sum = 0;
  for (let index = 0; index < 10; index += 1) sum += Number(digits[index]) * (11 - index);
  check = (sum * 10) % 11;
  if (check === 10) check = 0;
  return check === Number(digits[10]);
}

export function isValidCnpj(value: string) {
  const digits = normalizeCompanyTaxId(value);
  if (digits.length !== 14 || hasRepeatedDigits(digits)) return false;
  const calculate = (length: number) => {
    let sum = 0;
    let weight = length === 12 ? 5 : 6;
    for (let index = 0; index < length; index += 1) {
      sum += Number(digits[index]) * weight;
      weight -= 1;
      if (weight < 2) weight = 9;
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return calculate(12) === Number(digits[12]) && calculate(13) === Number(digits[13]);
}

export function validateCompanyTaxId(value: string): string | null {
  const digits = normalizeCompanyTaxId(value);
  if (!digits) return "CPF ou CNPJ é obrigatório";
  if (digits.length === 11) return isValidCpf(digits) ? null : "CPF inválido";
  if (digits.length === 14) return isValidCnpj(digits) ? null : "CNPJ inválido";
  return digits.length < 14 ? "CPF ou CNPJ é obrigatório" : "CNPJ inválido";
}

export function formatCompanyTaxId(value: string) {
  const digits = normalizeCompanyTaxId(value).slice(0, 14);
  if (digits.length <= 11) return digits.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  return digits.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4").replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

export function normalizeCompanyPhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function formatCompanyPhone(value: string) {
  const digits = normalizeCompanyPhone(value);
  if (digits.length <= 10) return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/^(\(\d{2}\) \d{4})(\d)/, "$1-$2");
  return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/^(\(\d{2}\) \d{5})(\d)/, "$1-$2");
}

export function validateCompanyPhone(value: string): string | null {
  const digits = normalizeCompanyPhone(value);
  return digits.length === 10 || digits.length === 11 ? null : "Telefone inválido";
}

export function validateCompanyEmail(value: string): string | null {
  return /^\S+@\S+\.\S+$/.test(value.trim()) ? null : "E-mail inválido";
}

export function getAuthErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("already registered") || message.includes("already been registered")) return "Este e-mail já está cadastrado.";
  if (message.includes("invalid login credentials")) return "E-mail ou senha inválidos.";
  if (message.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  return fallback;
}
