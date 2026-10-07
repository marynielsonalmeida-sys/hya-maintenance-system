"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCompany } from "@/lib/auth/company";
import { getAuthErrorMessage, validateCompanyName, validateRegistration } from "@/lib/auth/validation";
import { getCompatibleTechnicalParts } from "@/lib/technical-library/queries";

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

export type WorkflowActionResult<T = unknown> = { data?: T; error?: string; visitId?: string };

export async function createClientQuickAction(formData: FormData): Promise<WorkflowActionResult<{ id: string; name: string; responsible_name: string | null; phone: string | null; email: string | null; city: string | null }>> {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Informe o nome da academia." };
  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("create_client_quick", {
    p_name: name,
    p_responsible_name: String(formData.get("responsibleName") ?? "").trim() || null,
    p_phone: String(formData.get("phone") ?? "").trim() || null,
    p_email: String(formData.get("email") ?? "").trim() || null,
    p_city: String(formData.get("city") ?? "").trim() || null,
  });
  if (error || !id) return { error: "Não foi possível cadastrar a academia." };
  const { data: client } = await supabase.from("clients").select("id, name, responsible_name, phone, email, city").eq("id", id).maybeSingle();
  return client ? { data: { ...client, responsible_name: client.responsible_name ?? null } } : { error: "Academia cadastrada, mas não foi possível carregá-la." };
}

export async function createEquipmentQuickAction(formData: FormData): Promise<WorkflowActionResult<{ id: string; name: string; brand: string | null; model: string | null; location: string | null; status: string }>> {
  const clientId = String(formData.get("clientId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!clientId || name.length < 2) return { error: "Informe o equipamento." };
  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("create_equipment_quick", {
    p_client_id: clientId,
    p_name: name,
    p_category: String(formData.get("category") ?? "").trim() || null,
    p_brand: String(formData.get("brand") ?? "").trim() || null,
    p_model: String(formData.get("model") ?? "").trim() || null,
    p_serial_number: String(formData.get("serialNumber") ?? "").trim() || null,
    p_location: String(formData.get("location") ?? "").trim() || null,
  });
  if (error || !id) return { error: "Não foi possível cadastrar o equipamento." };
  const { data: equipment } = await supabase.from("equipment").select("id, name, brand, model, location, status").eq("id", id).maybeSingle();
  return equipment ? { data: equipment } : { error: "Equipamento cadastrado, mas não foi possível carregá-lo." };
}

export async function createServiceVisitAction(formData: FormData): Promise<WorkflowActionResult> {
  let payload: {
    clientId?: string; type?: "PREVENTIVE" | "CORRECTIVE" | "INSPECTION" | "INSTALLATION"; notes?: string;
    items?: Array<{ equipment_id: string; diagnosis: string; recommendation: string; status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" }>;
    materials?: Array<{ equipment_id?: string; line_type: "PRODUCT" | "MATERIAL"; description: string; quantity: number; unit: string; unit_price?: number | null }>;
    services?: Array<{ equipment_id?: string; line_type: "SERVICE" | "LABOR"; description: string; quantity: number; unit_price: number }>;
  };
  try {
    payload = JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return { error: "Os dados da visita são inválidos. Tente novamente." };
  }
  if (!payload.clientId || !payload.type || !payload.items?.length) return { error: "Selecione uma academia e pelo menos um equipamento." };
  const membership = await requireCompany();
  const supabase = await createClient();
  const { data: visitId, error } = await supabase.rpc("create_service_visit", {
    p_client_id: payload.clientId,
    p_type: payload.type,
    p_notes: payload.notes?.trim() || null,
    p_items: payload.items,
    p_materials: payload.materials ?? [],
    p_services: payload.services ?? [],
  });
  if (error || !visitId) return { error: "Não foi possível salvar a visita. Revise os dados e tente novamente." };

  const photoMetadata = JSON.parse(String(formData.get("photoMetadata") ?? "[]")) as Array<{ field: string; equipmentId: string; type: "PROBLEM" | "BEFORE" | "GENERAL" }>;
  for (const metadata of photoMetadata) {
    const file = formData.get(metadata.field);
    if (!(file instanceof File) || file.size === 0) continue;
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) continue;
    const extension = file.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    const path = `${membership.company_id}/${visitId}/${metadata.equipmentId}/${crypto.randomUUID()}.${extension}`;
    const upload = await supabase.storage.from("service-photos").upload(path, file, { contentType: file.type, upsert: false });
    if (upload.error) continue;
    await supabase.from("service_photos").insert({ company_id: membership.company_id, visit_id: visitId, equipment_id: metadata.equipmentId, type: metadata.type, storage_path: path });
  }
  redirect(`/visitas/${visitId}`);
}

export async function createManufacturerAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Informe o fabricante." };
  const membership = await requireCompany();
  const supabase = await createClient();
  const { error } = await supabase.from("manufacturers").insert({ company_id: membership.company_id, name, website: String(formData.get("website") ?? "").trim() || null, notes: String(formData.get("notes") ?? "").trim() || null });
  if (error) return { error: "Não foi possível salvar o fabricante." };
  return { success: "Fabricante salvo." };
}

export async function createEquipmentModelAction(formData: FormData) {
  const manufacturerId = String(formData.get("manufacturerId") ?? "");
  const modelName = String(formData.get("modelName") ?? "").trim();
  if (!manufacturerId || modelName.length < 2) redirect("/biblioteca-tecnica/modelos/novo?error=invalid");
  const membership = await requireCompany();
  const supabase = await createClient();
  const { data: manufacturer } = await supabase.from("manufacturers").select("id").eq("id", manufacturerId).eq("company_id", membership.company_id).maybeSingle();
  if (!manufacturer) redirect("/biblioteca-tecnica/modelos/novo?error=manufacturer");
  const { data: model, error } = await supabase.from("equipment_models").insert({ company_id: membership.company_id, manufacturer_id: manufacturerId, category: String(formData.get("category") ?? "OTHER"), model_name: modelName, model_code: String(formData.get("modelCode") ?? "").trim() || null, description: String(formData.get("description") ?? "").trim() || null, notes: String(formData.get("notes") ?? "").trim() || null }).select("id").single();
  if (error || !model) redirect("/biblioteca-tecnica/modelos/novo?error=save");
  redirect(`/biblioteca-tecnica/modelos/${model.id}`);
}

export async function getCompatiblePartsAction(modelId: string) {
  if (!modelId) return { data: [] };
  const parts = await getCompatibleTechnicalParts(modelId);
  return { data: parts ?? [] };
}
