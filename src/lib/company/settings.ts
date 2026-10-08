import "server-only";

import { getCurrentProfile, getCurrentUser, requireCompany } from "@/lib/auth/company";
import { createClient } from "@/lib/supabase/server";

export async function getCompanySettings() {
  const membership = await requireCompany();
  const supabase = await createClient();
  const [{ data: company, error: companyError }, profile, user] = await Promise.all([
    supabase.from("companies").select("*").eq("id", membership.company_id).maybeSingle(),
    getCurrentProfile(),
    getCurrentUser(),
  ]);
  if (companyError) {
    console.error("[company-settings] load failed", { code: companyError.code, message: companyError.message, companyId: membership.company_id });
    return { company: null, profile, user, membership };
  }
  return { company, profile, user, membership };
}

export async function getCompanyLogoUrl(path: string | null | undefined) {
  if (!path) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("company-assets").createSignedUrl(path, 60 * 10);
  if (error) {
    console.error("[company-settings] logo url failed", { code: error.name, message: error.message });
    return null;
  }
  return data.signedUrl;
}
