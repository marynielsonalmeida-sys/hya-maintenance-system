import { connection } from "next/server";
import { requireCompany } from "@/lib/auth/company";
import { createClient } from "@/lib/supabase/server";
import { NewVisitWizard } from "@/components/visits/new-visit-wizard";

export const instant = false;

export default async function NewVisitPage() {
  await connection();
  const membership = await requireCompany();
  const supabase = await createClient();
  const [{ data: clients }, { data: equipment }] = await Promise.all([
    supabase.from("clients").select("id, name, responsible_name, phone, email, city").eq("company_id", membership.company_id).order("name"),
    supabase.from("equipment").select("id, client_id, name, brand, model, location, status, category, serial_number, equipment_model_id").eq("company_id", membership.company_id).order("name"),
  ]);
  return <NewVisitWizard initialClients={clients ?? []} initialEquipment={equipment ?? []} />;
}
