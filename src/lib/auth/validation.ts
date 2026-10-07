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

export function getAuthErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("already registered") || message.includes("already been registered")) return "Este e-mail já está cadastrado.";
  if (message.includes("invalid login credentials")) return "E-mail ou senha inválidos.";
  if (message.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  return fallback;
}
