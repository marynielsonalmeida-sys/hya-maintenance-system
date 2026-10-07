"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCompany } from "@/lib/auth/company";
import { getAuthErrorMessage, normalizeCompanyPhone, normalizeCompanyTaxId, validateCompanyEmail, validateCompanyName, validateCompanyPhone, validateCompanyTaxId, validateRegistration } from "@/lib/auth/validation";
import { revalidatePath } from "next/cache";
import { getCompatibleTechnicalParts } from "@/lib/technical-library/queries";
import { calculateQuoteTotals } from "@/lib/quotes/calculations";

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
  const document = normalizeCompanyTaxId(String(formData.get("document") ?? ""));
  const documentError = validateCompanyTaxId(document);
  if (documentError) return { error: documentError };
  const phone = normalizeCompanyPhone(String(formData.get("phone") ?? ""));
  const phoneError = validateCompanyPhone(phone);
  if (phoneError) return { error: phoneError };
  const email = String(formData.get("email") ?? "").trim();
  const emailError = validateCompanyEmail(email);
  if (emailError) return { error: emailError };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("create_company_onboarding", { p_name: name, p_document: document, p_phone: phone, p_email: email });
  if (error) {
    console.error("[onboarding] create_company_onboarding failed", { code: error.code, message: error.message });
    if (error.message.includes("COMPANY_ALREADY_EXISTS")) redirect("/dashboard");
    return { error: "Não foi possível criar a empresa. Tente novamente." };
  }
  revalidatePath("/dashboard");
  revalidatePath("/onboarding");
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

export async function createQuoteFromVisitAction(formData: FormData): Promise<void> {
  const visitId = String(formData.get("visitId") ?? "");
  if (!visitId) redirect("/orcamentos/novo?error=visit");
  const membership = await requireCompany();
  const supabase = await createClient();
  const selectedPhotoIds = formData.getAll("photoId").map(String);
  const [{ data: visit }, { data: materials }, { data: services }, { data: photos }] = await Promise.all([
    supabase.from("service_visits").select("id, company_id, client_id").eq("id", visitId).eq("company_id", membership.company_id).maybeSingle(),
    supabase.from("service_visit_materials").select("*").eq("visit_id", visitId),
    supabase.from("service_visit_services").select("*").eq("visit_id", visitId),
    supabase.from("service_photos").select("id, type, equipment_id").eq("visit_id", visitId).in("type", ["PROBLEM", "BEFORE"]),
  ]);
  if (!visit) redirect("/orcamentos/novo?error=not-found");
  const rawItems = [
    ...(materials ?? []).map((item) => ({ equipment_id: item.equipment_id, item_type: item.line_type === "PRODUCT" ? "PRODUCT" : "MATERIAL", description: item.description, quantity: Number(item.quantity), unit: item.unit, unit_price: Number(item.unit_price ?? 0), technical_part_id: null })),
    ...(services ?? []).map((item) => ({ equipment_id: item.equipment_id, item_type: item.line_type === "LABOR" ? "LABOR" : "SERVICE", description: item.description, quantity: Number(item.quantity), unit: "UNIDADE", unit_price: Number(item.unit_price), technical_part_id: null })),
  ];
  const totals = calculateQuoteTotals(rawItems, 0);
  const quoteNumber = `ORC-${crypto.randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`;
  const { data: quote, error } = await supabase.from("quotes").insert({ company_id: membership.company_id, client_id: visit.client_id, service_visit_id: visitId, quote_number: quoteNumber, status: "DRAFT", subtotal: totals.subtotal, discount: 0, total: totals.total, notes: null }).select("id").single();
  if (error || !quote) redirect("/orcamentos/novo?error=save");
  if (rawItems.length) await supabase.from("quote_items").insert(rawItems.map((item, index) => ({ quote_id: quote.id, line_number: index + 1, ...item, total: Number((item.quantity * item.unit_price).toFixed(2)) })));
  const equipmentIds = [...new Set(rawItems.map((item) => item.equipment_id).filter((id): id is string => Boolean(id)))];
  if (equipmentIds.length) await supabase.from("quote_equipments").insert(equipmentIds.map((equipment_id) => ({ quote_id: quote.id, equipment_id })));
  const selectedPhotos = formData.get("photoSelection") ? (photos ?? []).filter((photo) => selectedPhotoIds.includes(photo.id)) : photos ?? [];
  if (selectedPhotos.length) await supabase.from("quote_photos").insert(selectedPhotos.map((photo) => ({ quote_id: quote.id, photo_id: photo.id })));
  redirect(`/orcamentos/${quote.id}`);
}

export async function updateQuoteStatusAction(formData: FormData): Promise<void> {
  const quoteId = String(formData.get("quoteId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!quoteId || !["DRAFT", "SENT", "APPROVED", "REJECTED", "EXPIRED", "CONVERTED"].includes(status)) redirect("/orcamentos?error=status");
  const membership = await requireCompany();
  const supabase = await createClient();
  const { error } = await supabase.from("quotes").update({ status }).eq("id", quoteId).eq("company_id", membership.company_id);
  if (error) redirect(`/orcamentos/${quoteId}?error=status`);
  redirect(`/orcamentos/${quoteId}`);
}

export async function updateQuoteAction(formData: FormData): Promise<void> {
  const quoteId = String(formData.get("quoteId") ?? "");
  const discount = Math.max(0, Number(formData.get("discount") ?? 0));
  const validUntil = String(formData.get("validUntil") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const membership = await requireCompany();
  const supabase = await createClient();
  const { data: items } = await supabase.from("quote_items").select("quantity, unit_price").eq("quote_id", quoteId);
  const totals = calculateQuoteTotals((items ?? []).map((item) => ({ quantity: Number(item.quantity), unit_price: Number(item.unit_price) })), discount);
  const { error } = await supabase.from("quotes").update({ ...totals, valid_until: validUntil, notes }).eq("id", quoteId).eq("company_id", membership.company_id);
  if (error) redirect(`/orcamentos/${quoteId}/editar?error=save`);
  redirect(`/orcamentos/${quoteId}`);
}
