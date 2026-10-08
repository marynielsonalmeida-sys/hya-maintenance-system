import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/auth/company";
import type { FeatureCode } from "@/types/database";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (client: unknown) => client as any;

export async function hasFeature(companyId: string, feature: FeatureCode) {
  const supabase = await createClient();
  const { data: company } = await supabase.from("companies").select("plan_code").eq("id", companyId).maybeSingle();
  if (company?.plan_code === "PRO") return true;
  const { data: entitlement } = await db(supabase).from("company_feature_entitlements").select("enabled, expires_at").eq("company_id", companyId).eq("feature_code", feature).maybeSingle();
  return Boolean(entitlement?.enabled && (!entitlement.expires_at || new Date(entitlement.expires_at) > new Date()));
}
export async function requireFeature(feature: FeatureCode) { const membership = await getCurrentMembership(); if (!membership) redirect("/login"); if (!(await hasFeature(membership.company_id, feature))) redirect("/meu-contador?locked=1"); return membership; }
