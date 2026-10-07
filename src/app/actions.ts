"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthErrorMessage, validateCompanyName, validateRegistration } from "@/lib/auth/validation";

export type ActionState = { error?: string; success?: string };

export async function signInAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Informe e-mail e senha." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: getAuthErrorMessage(error, "Não foi possível entrar. Tente novamente.") };
  redirect("/dashboard");
}

export async function signUpAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const validationError = validateRegistration({ fullName, email, password, confirmPassword });
  if (validationError) return { error: validationError.message };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
  if (error) return { error: getAuthErrorMessage(error, "Não foi possível criar sua conta.") };
  if (!data.session) return { success: "Cadastro realizado. Confirme seu e-mail para continuar." };
  redirect("/onboarding");
}

export async function createCompanyAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const validationError = validateCompanyName(name);
  if (validationError) return { error: validationError };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("create_company_onboarding", { p_name: name, p_document: String(formData.get("document") ?? "").trim() || null, p_phone: String(formData.get("phone") ?? "").trim() || null, p_email: String(formData.get("email") ?? "").trim() || user.email || null });
  if (error) {
    if (error.message.includes("COMPANY_ALREADY_EXISTS")) redirect("/dashboard");
    return { error: "Não foi possível criar a empresa. Tente novamente." };
  }
  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
