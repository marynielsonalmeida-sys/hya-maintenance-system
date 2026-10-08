"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership, getCurrentUser, requireCompany } from "@/lib/auth/company";
import { getAuthErrorMessage, normalizeCompanyPhone, normalizeCompanyTaxId, validateCompanyEmail, validateCompanyName, validateCompanyPhone, validateCompanyTaxId, validateRegistration } from "@/lib/auth/validation";
import { revalidatePath } from "next/cache";
import { getCompatibleTechnicalParts } from "@/lib/technical-library/queries";
import { calculateQuoteTotals } from "@/lib/quotes/calculations";
import type { PhotoType, WorkOrderExecutionAction, WorkOrderStatus } from "@/types/database";
import { parseNfeXml } from "@/lib/accounting/xml";
import { getFiscalProvider } from "@/lib/accounting/provider";

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
  const existingMembership = await getCurrentMembership();
  if (existingMembership) {
    revalidatePath("/dashboard");
    revalidatePath("/onboarding");
    redirect("/dashboard");
  }
  const { error } = await supabase.rpc("create_company_onboarding", { p_name: name, p_document: document, p_phone: phone, p_email: email });
  if (error) {
    console.error("[onboarding] create_company_onboarding failed", { code: error.code, message: error.message });
    if (error.code === "23505" || error.message.includes("COMPANY_ALREADY_EXISTS")) redirect("/dashboard");
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

export async function updateCompanySettingsAction(formData: FormData): Promise<void> {
  const membership = await requireCompany();
  const name = String(formData.get("commercialName") ?? "").trim();
  const document = normalizeCompanyTaxId(String(formData.get("document") ?? ""));
  const phone = normalizeCompanyPhone(String(formData.get("phone") ?? ""));
  const whatsapp = normalizeCompanyPhone(String(formData.get("whatsapp") ?? ""));
  const email = String(formData.get("email") ?? "").trim();
  const nameError = validateCompanyName(name);
  const documentError = validateCompanyTaxId(document);
  const phoneError = validateCompanyPhone(phone);
  const whatsappError = validateCompanyPhone(whatsapp);
  const emailError = validateCompanyEmail(email);
  if (nameError || documentError || phoneError || whatsappError || emailError) redirect("/configuracoes?error=validation");
  const supabase = await createClient();
  const { error } = await supabase.from("companies").update({
    name,
    commercial_name: name,
    legal_name: String(formData.get("legalName") ?? "").trim() || null,
    document,
    phone,
    whatsapp,
    email,
    postal_code: String(formData.get("postalCode") ?? "").replace(/\D/g, "").slice(0, 8) || null,
    street: String(formData.get("street") ?? "").trim() || null,
    address_number: String(formData.get("addressNumber") ?? "").trim() || null,
    complement: String(formData.get("complement") ?? "").trim() || null,
    neighborhood: String(formData.get("neighborhood") ?? "").trim() || null,
    city: String(formData.get("city") ?? "").trim() || null,
    state: String(formData.get("state") ?? "").trim().toUpperCase().slice(0, 2) || null,
    website: String(formData.get("website") ?? "").trim() || null,
  }).eq("id", membership.company_id);
  if (error) {
    console.error("[company-settings] update failed", { code: error.code, message: error.message, companyId: membership.company_id });
    redirect("/configuracoes?error=save");
  }
  revalidatePath("/configuracoes");
  revalidatePath("/dashboard");
  redirect("/configuracoes?saved=1");
}

export async function uploadCompanyLogoAction(formData: FormData): Promise<void> {
  const membership = await requireCompany();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0 || !["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) redirect("/configuracoes?error=logo");
  const supabase = await createClient();
  const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const logoPath = `${membership.company_id}/logo.${extension}`;
  const upload = await supabase.storage.from("company-assets").upload(logoPath, file, { contentType: file.type, upsert: true });
  if (upload.error) {
    console.error("[company-settings] logo upload failed", { code: upload.error.name, message: upload.error.message, companyId: membership.company_id });
    redirect("/configuracoes?error=logo");
  }
  const { error } = await supabase.from("companies").update({ logo_path: logoPath }).eq("id", membership.company_id);
  if (error) {
    console.error("[company-settings] logo path update failed", { code: error.code, message: error.message, companyId: membership.company_id });
    redirect("/configuracoes?error=logo");
  }
  revalidatePath("/configuracoes");
  revalidatePath("/dashboard");
  redirect("/configuracoes?logo=updated");
}

export async function removeCompanyLogoAction(): Promise<void> {
  const membership = await requireCompany();
  const supabase = await createClient();
  const { data: company } = await supabase.from("companies").select("logo_path").eq("id", membership.company_id).maybeSingle();
  if (company?.logo_path) await supabase.storage.from("company-assets").remove([company.logo_path]);
  const { error } = await supabase.from("companies").update({ logo_path: null }).eq("id", membership.company_id);
  if (error) {
    console.error("[company-settings] logo removal failed", { code: error.code, message: error.message, companyId: membership.company_id });
    redirect("/configuracoes?error=logo");
  }
  revalidatePath("/configuracoes");
  redirect("/configuracoes?logo=removed");
}

export async function updateProfileAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (fullName.length < 2) redirect("/configuracoes?error=profile");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: fullName, phone: normalizeCompanyPhone(String(formData.get("phone") ?? "")) || null }).eq("id", user.id);
  if (error) {
    console.error("[profile] update failed", { code: error.code, message: error.message, userId: user.id });
    redirect("/configuracoes?error=profile");
  }
  revalidatePath("/configuracoes");
  revalidatePath("/dashboard");
  redirect("/configuracoes?saved=profile");
}

export type WorkflowActionResult<T = unknown> = { data?: T; error?: string; visitId?: string };

export async function createClientQuickAction(formData: FormData): Promise<WorkflowActionResult<{ id: string; name: string; responsible_name: string | null; phone: string | null; email: string | null; city: string | null }>> {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Informe o nome da academia." };
  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("create_client_quick", {
    p_name: name,
    p_responsible_name: String(formData.get("responsibleName") ?? "").trim() || null,
    p_phone: normalizeCompanyPhone(String(formData.get("phone") ?? "")) || null,
    p_email: String(formData.get("email") ?? "").trim() || null,
    p_city: String(formData.get("city") ?? "").trim() || null,
  });
  if (error || !id) {
    console.error("[visit] quick client RPC failed", { code: error?.code, message: error?.message });
    return { error: "Não foi possível cadastrar a academia." };
  }
  const { data: client, error: selectError } = await supabase.from("clients").select("id, name, responsible_name, phone, email, city").eq("id", id).maybeSingle();
  if (selectError) {
    console.error("[visit] quick client reload failed", { code: selectError.code, message: selectError.message, clientId: id });
    return { error: "A academia foi cadastrada, mas não foi possível atualizar a lista. Tente novamente." };
  }
  return client ? { data: { ...client, responsible_name: client.responsible_name ?? null } } : { error: "A academia foi cadastrada, mas não foi localizada na sua empresa." };
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
  if (error || !id) {
    console.error("[visit] quick equipment RPC failed", { code: error?.code, message: error?.message, clientId });
    return { error: "Não foi possível cadastrar o equipamento." };
  }
  const equipmentModelId = String(formData.get("equipmentModelId") ?? "").trim();
  if (equipmentModelId) {
    const { data: technicalModel, error: modelError } = await supabase
      .from("equipment_models")
      .select("id, category, model_name")
      .eq("id", equipmentModelId)
      .eq("company_id", (await getCurrentMembership())?.company_id ?? "")
      .maybeSingle();
    if (modelError || !technicalModel) {
      console.error("[visit] quick equipment technical model validation failed", { code: modelError?.code, message: modelError?.message, equipmentId: id, equipmentModelId });
      return { error: "O equipamento foi cadastrado, mas o modelo técnico selecionado não é válido." };
    }
    const { error: linkError } = await supabase.from("equipment").update({ equipment_model_id: technicalModel.id }).eq("id", id).eq("client_id", clientId);
    if (linkError) {
      console.error("[visit] quick equipment technical link failed", { code: linkError.code, message: linkError.message, equipmentId: id, equipmentModelId });
      return { error: "O equipamento foi cadastrado, mas não foi possível vinculá-lo ao modelo técnico." };
    }
  }
  const { data: equipment, error: selectError } = await supabase.from("equipment").select("id, name, brand, model, location, status").eq("id", id).maybeSingle();
  if (selectError) {
    console.error("[visit] quick equipment reload failed", { code: selectError.code, message: selectError.message, equipmentId: id, clientId });
    return { error: "O equipamento foi cadastrado, mas não foi possível atualizar a lista. Tente novamente." };
  }
  return equipment ? { data: equipment } : { error: "O equipamento foi cadastrado, mas não foi localizado na sua empresa." };
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
  if (status === "APPROVED") {
    const { data: workOrderId, error: workOrderError } = await supabase.rpc("create_work_order_from_quote", { p_quote_id: quoteId });
    if (workOrderError || !workOrderId) {
      console.error("[work-order] automatic creation after approval failed", { code: workOrderError?.code, message: workOrderError?.message, quoteId });
      redirect(`/orcamentos/${quoteId}?error=work-order`);
    }
    revalidatePath("/ordens");
    redirect(`/ordens/${workOrderId}`);
  }
  redirect(`/orcamentos/${quoteId}`);
}

export async function createWorkOrderFromQuoteAction(formData: FormData): Promise<void> {
  const quoteId = String(formData.get("quoteId") ?? "");
  if (!quoteId) redirect("/orcamentos?error=quote");
  await requireCompany();
  const supabase = await createClient();
  const { data: workOrderId, error } = await supabase.rpc("create_work_order_from_quote", { p_quote_id: quoteId });
  if (error || !workOrderId) {
    console.error("[work-order] create from quote failed", { code: error?.code, message: error?.message, quoteId });
    redirect(`/orcamentos/${quoteId}?error=work-order`);
  }
  revalidatePath("/ordens");
  revalidatePath(`/orcamentos/${quoteId}`);
  redirect(`/ordens/${workOrderId}`);
}

const workOrderStatuses: WorkOrderStatus[] = ["DRAFT", "SCHEDULED", "IN_PROGRESS", "WAITING_PARTS", "COMPLETED", "CANCELLED"];

export async function updateWorkOrderStatusAction(formData: FormData): Promise<void> {
  const workOrderId = String(formData.get("workOrderId") ?? "");
  const status = String(formData.get("status") ?? "") as WorkOrderStatus;
  if (!workOrderId || !workOrderStatuses.includes(status)) redirect("/ordens?error=status");
  const membership = await requireCompany();
  const supabase = await createClient();
  const updates: Record<string, string | null> = { status };
  if (status === "IN_PROGRESS") updates.started_at = new Date().toISOString();
  if (status === "COMPLETED") updates.finished_at = new Date().toISOString();
  const { error } = await supabase.from("work_orders").update(updates).eq("id", workOrderId).eq("company_id", membership.company_id);
  if (error) {
    console.error("[work-order] status update failed", { code: error.code, message: error.message, workOrderId, status });
    redirect(`/ordens/${workOrderId}?error=status`);
  }
  revalidatePath("/ordens");
  revalidatePath(`/ordens/${workOrderId}`);
  redirect(`/ordens/${workOrderId}`);
}

const executionActions: WorkOrderExecutionAction[] = ["REPLACED", "REPAIRED", "ADJUSTED", "INSPECTED", "CLEANED", "LUBRICATED", "INSTALLED", "REMOVED"];

export async function addWorkOrderExecutionItemAction(formData: FormData): Promise<void> {
  const workOrderId = String(formData.get("workOrderId") ?? "");
  const equipmentId = String(formData.get("equipmentId") ?? "") || null;
  const description = String(formData.get("description") ?? "").trim();
  const action = String(formData.get("action") ?? "") as WorkOrderExecutionAction;
  const quantity = Number(formData.get("quantity") ?? 1);
  if (!workOrderId || !description || !executionActions.includes(action) || !Number.isFinite(quantity) || quantity <= 0) redirect(`/ordens/${workOrderId}?error=item`);
  const membership = await requireCompany();
  const supabase = await createClient();
  const { data: workOrder } = await supabase.from("work_orders").select("id").eq("id", workOrderId).eq("company_id", membership.company_id).maybeSingle();
  if (!workOrder) redirect("/ordens?error=not-found");
  const { error } = await supabase.from("work_order_execution_items").insert({
    company_id: membership.company_id,
    work_order_id: workOrderId,
    equipment_id: equipmentId,
    technical_part_id: String(formData.get("technicalPartId") ?? "") || null,
    product_id: String(formData.get("productId") ?? "") || null,
    description,
    quantity,
    unit: String(formData.get("unit") ?? "UNIDADE"),
    unit_cost: Number(formData.get("unitCost") ?? 0) || null,
    unit_price: Number(formData.get("unitPrice") ?? 0) || null,
    action,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  if (error) {
    console.error("[work-order] execution item failed", { code: error.code, message: error.message, workOrderId });
    redirect(`/ordens/${workOrderId}?error=item`);
  }
  revalidatePath(`/ordens/${workOrderId}`);
  redirect(`/ordens/${workOrderId}`);
}

export async function updateWorkOrderEquipmentAction(formData: FormData): Promise<void> {
  const workOrderId = String(formData.get("workOrderId") ?? "");
  const equipmentId = String(formData.get("equipmentId") ?? "");
  await requireCompany();
  const supabase = await createClient();
  const { error } = await supabase.from("work_order_equipment").update({
    service_performed: String(formData.get("servicePerformed") ?? "").trim() || null,
    technical_notes: String(formData.get("technicalNotes") ?? "").trim() || null,
    status: String(formData.get("status") ?? "IN_PROGRESS"),
  }).eq("work_order_id", workOrderId).eq("equipment_id", equipmentId);
  if (error) {
    console.error("[work-order] equipment update failed", { code: error.code, message: error.message, workOrderId, equipmentId });
    redirect(`/ordens/${workOrderId}?error=equipment`);
  }
  revalidatePath(`/ordens/${workOrderId}`);
  redirect(`/ordens/${workOrderId}`);
}

export async function uploadWorkOrderPhotoAction(formData: FormData): Promise<void> {
  const workOrderId = String(formData.get("workOrderId") ?? "");
  const equipmentId = String(formData.get("equipmentId") ?? "") || null;
  const type = String(formData.get("type") ?? "") as PhotoType;
  const file = formData.get("file");
  if (!workOrderId || !(file instanceof File) || file.size === 0 || !["BEFORE", "AFTER", "DURING", "GENERAL"].includes(type)) redirect(`/ordens/${workOrderId}?error=photo`);
  if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) redirect(`/ordens/${workOrderId}?error=photo`);
  const membership = await requireCompany();
  const supabase = await createClient();
  const extension = file.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  const storagePath = `${membership.company_id}/work-orders/${workOrderId}/${crypto.randomUUID()}.${extension}`;
  const upload = await supabase.storage.from("service-photos").upload(storagePath, file, { contentType: file.type, upsert: false });
  if (upload.error) {
    console.error("[work-order] photo upload failed", { code: upload.error.name, message: upload.error.message, workOrderId });
    redirect(`/ordens/${workOrderId}?error=photo`);
  }
  const { error } = await supabase.from("work_order_photos").insert({ company_id: membership.company_id, work_order_id: workOrderId, equipment_id: equipmentId, type, storage_path: storagePath, caption: String(formData.get("caption") ?? "").trim() || null });
  if (error) {
    console.error("[work-order] photo record failed", { code: error.code, message: error.message, workOrderId });
    redirect(`/ordens/${workOrderId}?error=photo`);
  }
  revalidatePath(`/ordens/${workOrderId}`);
  redirect(`/ordens/${workOrderId}`);
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

export async function importPurchaseInvoiceXmlAction(formData: FormData): Promise<void> {
  const membership = await requireCompany();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > 10 * 1024 * 1024 || (!file.name.toLowerCase().endsWith(".xml") && file.type !== "application/xml" && file.type !== "text/xml")) redirect("/meu-contador/notas-recebidas?error=file");
  let parsed;
  try { parsed = parseNfeXml(await file.text()); } catch (error) { console.error("[accounting] XML import rejected", { companyId: membership.company_id, message: error instanceof Error ? error.message : "invalid_xml" }); redirect("/meu-contador/notas-recebidas?error=xml"); }
  const supabase = await createClient();
  const supplierDocument = parsed.supplierDocument?.replace(/\D/g, "") || null;
  const { data: supplier } = supplierDocument ? await supabase.from("suppliers").select("id").eq("company_id", membership.company_id).eq("document", supplierDocument).maybeSingle() : { data: null };
  let supplierId = supplier?.id ?? null;
  if (!supplierId && parsed.supplierName) { const created = await supabase.from("suppliers").insert({ company_id: membership.company_id, legal_name: parsed.supplierName, document: supplierDocument, active: true }).select("id").single(); if (created.error) { console.error("[accounting] supplier creation failed", { code: created.error.code, message: created.error.message, companyId: membership.company_id }); redirect("/meu-contador/notas-recebidas?error=supplier"); } supplierId = created.data.id; }
  const path = `${membership.company_id}/purchase-invoices/${crypto.randomUUID()}.xml`;
  const upload = await supabase.storage.from("fiscal-documents").upload(path, file, { contentType: "application/xml", upsert: false });
  if (upload.error) { console.error("[accounting] XML upload failed", { code: upload.error.name, message: upload.error.message, companyId: membership.company_id }); redirect("/meu-contador/notas-recebidas?error=upload"); }
  const { data: invoice, error } = await supabase.from("purchase_invoices").insert({ company_id: membership.company_id, supplier_id: supplierId, access_key: parsed.accessKey, number: parsed.number, series: parsed.series, issue_date: parsed.issueDate, total_amount: parsed.totalAmount, status: "PENDING_REVIEW", xml_path: path, raw_metadata: parsed }).select("id").single();
  if (error || !invoice) { if (error?.code === "23505") redirect("/meu-contador/notas-recebidas?error=duplicate"); console.error("[accounting] purchase invoice creation failed", { code: error?.code, message: error?.message, companyId: membership.company_id }); await supabase.storage.from("fiscal-documents").remove([path]); redirect("/meu-contador/notas-recebidas?error=invoice"); }
  const items = parsed.items.map((item) => ({ company_id: membership.company_id, purchase_invoice_id: invoice.id, supplier_code: item.supplierCode, description: item.description, ncm: item.ncm, cfop: item.cfop, unit: item.unit, quantity: item.quantity, unit_cost: item.unitCost, total_cost: item.totalCost, taxes: item.taxes }));
  if (items.length) { const inserted = await supabase.from("purchase_invoice_items").insert(items); if (inserted.error) { console.error("[accounting] purchase invoice items failed", { code: inserted.error.code, message: inserted.error.message, invoiceId: invoice.id }); redirect("/meu-contador/notas-recebidas?error=items"); } }
  revalidatePath("/meu-contador"); revalidatePath("/meu-contador/notas-recebidas"); revalidatePath("/meu-contador/compras"); redirect("/meu-contador/notas-recebidas?imported=1");
}

export async function postPurchaseInvoiceAction(formData: FormData): Promise<void> { const invoiceId = String(formData.get("invoiceId") ?? ""); const membership = await requireCompany(); const supabase = await createClient(); const { error } = await supabase.rpc("post_purchase_invoice", { p_invoice_id: invoiceId }); if (error) { console.error("[accounting] post purchase failed", { code: error.code, message: error.message, invoiceId, companyId: membership.company_id }); redirect("/meu-contador/compras?error=post"); } revalidatePath("/meu-contador"); revalidatePath("/meu-contador/compras"); revalidatePath("/meu-contador/estoque"); redirect("/meu-contador/compras?posted=1"); }

export async function createSupplierAction(formData: FormData): Promise<void> { const membership = await requireCompany(); const name = String(formData.get("legalName") ?? "").trim(); if (name.length < 2) redirect("/meu-contador/fornecedores?error=validation"); const supabase = await createClient(); const { error } = await supabase.from("suppliers").insert({ company_id: membership.company_id, legal_name: name, trade_name: String(formData.get("tradeName") ?? "").trim() || null, document: String(formData.get("document") ?? "").replace(/\D/g, "") || null, email: String(formData.get("email") ?? "").trim() || null, phone: String(formData.get("phone") ?? "").replace(/\D/g, "") || null, active: true }); if (error) { console.error("[accounting] supplier failed", { code: error.code, message: error.message, companyId: membership.company_id }); redirect("/meu-contador/fornecedores?error=save"); } revalidatePath("/meu-contador"); revalidatePath("/meu-contador/fornecedores"); redirect("/meu-contador/fornecedores?saved=1"); }

export async function createInventoryProductAction(formData: FormData): Promise<void> { const membership = await requireCompany(); const name = String(formData.get("name") ?? "").trim(); if (name.length < 2) redirect("/meu-contador/estoque?error=validation"); const supabase = await createClient(); const { error } = await supabase.from("inventory_products").insert({ company_id: membership.company_id, name, sku: String(formData.get("sku") ?? "").trim() || null, unit: String(formData.get("unit") ?? "UN").trim(), minimum_stock: Number(formData.get("minimumStock") ?? 0) || 0, current_stock: 0, average_cost: 0, active: true }); if (error) { console.error("[accounting] inventory product failed", { code: error.code, message: error.message, companyId: membership.company_id }); redirect("/meu-contador/estoque?error=save"); } revalidatePath("/meu-contador"); revalidatePath("/meu-contador/estoque"); redirect("/meu-contador/estoque?saved=1"); }

export async function createObligationAction(formData: FormData): Promise<void> { const membership = await requireCompany(); const title = String(formData.get("title") ?? "").trim(); if (!title) redirect("/meu-contador/obrigacoes?error=validation"); const supabase = await createClient(); const { error } = await supabase.from("company_obligations").insert({ company_id: membership.company_id, title, obligation_type: String(formData.get("type") ?? "OUTRA"), reference_period: String(formData.get("period") ?? "").trim() || "NÃO INFORMADO", due_date: String(formData.get("dueDate") ?? "") || null, status: "PENDING" }); if (error) { console.error("[accounting] obligation failed", { code: error.code, message: error.message, companyId: membership.company_id }); redirect("/meu-contador/obrigacoes?error=save"); } revalidatePath("/meu-contador"); revalidatePath("/meu-contador/obrigacoes"); redirect("/meu-contador/obrigacoes?saved=1"); }

export async function saveFiscalSettingsAction(formData: FormData): Promise<void> { const membership = await requireCompany(); const supabase = await createClient(); const { error } = await supabase.from("fiscal_settings").upsert({ company_id: membership.company_id, provider: "MANUAL", environment: String(formData.get("environment") ?? "HOMOLOGACAO"), tax_regime: String(formData.get("taxRegime") ?? "").trim() || null, active: true, settings: {} }, { onConflict: "company_id" }); if (error) { console.error("[accounting] fiscal settings failed", { code: error.code, message: error.message, companyId: membership.company_id }); redirect("/meu-contador/configuracao-fiscal?error=save"); } revalidatePath("/meu-contador/configuracao-fiscal"); redirect("/meu-contador/configuracao-fiscal?saved=1"); }

export async function createManualFiscalInvoiceAction(formData: FormData): Promise<void> { await requireCompany(); const provider = getFiscalProvider(); try { await provider.issueServiceInvoice({ companyId: "manual", amount: Number(formData.get("amount") ?? 0), description: String(formData.get("description") ?? "") }); } catch (error) { console.error("[accounting] fiscal provider unavailable", { message: error instanceof Error ? error.message : "provider_error" }); redirect("/meu-contador/emitir-nota?error=not-configured"); } }
