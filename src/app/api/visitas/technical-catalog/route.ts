import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/auth/company";
import type { EquipmentModelCategory } from "@/types/database";

const limit = 20;
const categoryLabels: Record<string, string> = { TREADMILL: "Esteira", CROSSOVER: "Cross over", BIKE: "Bicicleta", ELLIPTICAL: "Elíptico", LEG_PRESS: "Leg press", LEG_EXTENSION: "Cadeira extensora", LEG_CURL: "Mesa flexora", CHEST_PRESS: "Chest press", FREE_WEIGHT: "Peso livre", OTHER: "Outro" };

export async function GET(request: Request) {
  const membership = await getCurrentMembership();
  if (!membership) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const query = (url.searchParams.get("q") ?? "").trim();
  const category = url.searchParams.get("category");
  const manufacturerId = url.searchParams.get("manufacturerId");
  const supabase = await createClient();

  if (kind === "category") {
    const { data, error } = await supabase.from("equipment_models").select("category").eq("company_id", membership.company_id).limit(200);
    if (error) return NextResponse.json({ error: "CATALOG_UNAVAILABLE" }, { status: 500 });
    const values = [...new Set((data ?? []).map((row) => String(row.category)).filter(Boolean))].map((value) => ({ id: value, label: categoryLabels[value] ?? value })).filter((item) => item.label.toLowerCase().includes(query.toLowerCase()) || item.id.toLowerCase().includes(query.toLowerCase())).slice(0, limit);
    return NextResponse.json({ items: values });
  }

  if (kind === "manufacturer") {
    let models = supabase.from("equipment_models").select("manufacturer_id").eq("company_id", membership.company_id).limit(200);
    if (category) models = models.eq("category", category as EquipmentModelCategory);
    const { data: modelRows, error: modelError } = await models;
    if (modelError) return NextResponse.json({ error: "CATALOG_UNAVAILABLE" }, { status: 500 });
    const manufacturerIds = [...new Set((modelRows ?? []).map((row) => row.manufacturer_id))];
    if (!manufacturerIds.length) return NextResponse.json({ items: [] });
    const { data, error } = await supabase.from("manufacturers").select("id, name").eq("company_id", membership.company_id).in("id", manufacturerIds).ilike("name", `%${query}%`).order("name").limit(limit);
    if (error) return NextResponse.json({ error: "CATALOG_UNAVAILABLE" }, { status: 500 });
    return NextResponse.json({ items: data ?? [] });
  }

  if (kind === "model") {
    let models = supabase.from("equipment_models").select("id, model_name, model_code, category, manufacturer_id").eq("company_id", membership.company_id).order("model_name").limit(limit);
    if (category) models = models.eq("category", category as EquipmentModelCategory);
    if (manufacturerId) models = models.eq("manufacturer_id", manufacturerId);
    if (query) models = models.or(`model_name.ilike.%${query}%,model_code.ilike.%${query}%`);
    const { data, error } = await models;
    if (error) return NextResponse.json({ error: "CATALOG_UNAVAILABLE" }, { status: 500 });
    return NextResponse.json({ items: data ?? [] });
  }

  return NextResponse.json({ error: "INVALID_KIND" }, { status: 400 });
}
