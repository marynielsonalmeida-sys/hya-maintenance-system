import "server-only";

import { requireCompany } from "@/lib/auth/company";
import { createClient } from "@/lib/supabase/server";
import { technicalLibraryMatches } from "@/lib/technical-library/search";

export async function searchTechnicalLibrary(query: string) {
  const membership = await requireCompany();
  const supabase = await createClient();
  const term = query.trim();
  const [manufacturers, allModels, allParts] = await Promise.all([
    supabase.from("manufacturers").select("*").eq("company_id", membership.company_id).order("name").limit(100),
    supabase.from("equipment_models").select("*").eq("company_id", membership.company_id).order("model_name").limit(100),
    supabase.from("technical_parts").select("*").eq("company_id", membership.company_id).order("name").limit(100),
  ]);
  const manufacturerRows = manufacturers.data ?? [];
  const manufacturerNames = new Map(manufacturerRows.map((manufacturer) => [manufacturer.id, manufacturer.name]));
  const models = (allModels.data ?? []).filter((model) => technicalLibraryMatches(term, [model.model_name, model.model_code, model.description, manufacturerNames.get(model.manufacturer_id)])).slice(0, 30);
  const parts = (allParts.data ?? []).filter((part) => technicalLibraryMatches(term, [part.name, part.code, part.manufacturer_reference, part.description], part.specification)).slice(0, 30);
  const modelIds = models.map((model) => model.id);
  const partLinks = modelIds.length ? await supabase.from("model_parts").select("model_id, part_id, technical_value, is_recommended").in("model_id", modelIds) : { data: [] };
  const linkedPartIds = (partLinks.data ?? []).map((link) => link.part_id);
  const relatedParts = linkedPartIds.length ? await supabase.from("technical_parts").select("*").eq("company_id", membership.company_id).in("id", linkedPartIds) : { data: [] };
  const matchingManufacturers = manufacturerRows.filter((manufacturer) => technicalLibraryMatches(term, [manufacturer.name, manufacturer.website, manufacturer.notes])).slice(0, 20);
  return { manufacturers: matchingManufacturers, models, parts: [...parts, ...(relatedParts.data ?? [])].filter((part, index, all) => all.findIndex((candidate) => candidate.id === part.id) === index), partLinks: partLinks.data ?? [] };
}

export async function getEquipmentModelLibrary(modelId: string) {
  const membership = await requireCompany();
  const supabase = await createClient();
  const { data: model } = await supabase.from("equipment_models").select("*").eq("id", modelId).eq("company_id", membership.company_id).maybeSingle();
  if (!model) return null;
  const [{ data: manufacturer }, { data: components }, { data: links }, { data: documents }] = await Promise.all([
    supabase.from("manufacturers").select("*").eq("id", model.manufacturer_id).eq("company_id", membership.company_id).maybeSingle(),
    supabase.from("model_components").select("*").eq("model_id", modelId),
    supabase.from("model_parts").select("*").eq("model_id", modelId),
    supabase.from("technical_documents").select("*").eq("equipment_model_id", modelId).eq("company_id", membership.company_id).order("title"),
  ]);
  const componentIds = (components ?? []).map((component) => component.component_id);
  const partIds = (links ?? []).map((link) => link.part_id);
  const [{ data: componentRows }, { data: partRows }, { data: specifications }] = await Promise.all([
    componentIds.length ? supabase.from("technical_components").select("*").in("id", componentIds).eq("company_id", membership.company_id) : Promise.resolve({ data: [] }),
    partIds.length ? supabase.from("technical_parts").select("*").in("id", partIds).eq("company_id", membership.company_id) : Promise.resolve({ data: [] }),
    supabase.from("technical_specifications").select("*").eq("company_id", membership.company_id).or(`equipment_model_id.eq.${modelId}${partIds.length ? `,technical_part_id.in.(${partIds.join(",")})` : ""}`).order("specification_key"),
  ]);
  return { model, manufacturer, components: componentRows ?? [], componentLinks: components ?? [], parts: partRows ?? [], partLinks: links ?? [], documents: documents ?? [], specifications: specifications ?? [] };
}

export async function getCompatibleTechnicalParts(modelId: string) {
  const library = await getEquipmentModelLibrary(modelId);
  if (!library) return null;
  return library.parts.map((part) => ({ part, link: library.partLinks.find((link) => link.part_id === part.id) }));
}
