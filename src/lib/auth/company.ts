import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, Company, CompanyMember, Profile } from "@/types/database";

export type CurrentMembership = CompanyMember & { company: Company };

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) return null;
  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data;
}

export async function getCurrentMembership(): Promise<CurrentMembership | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data: member } = await supabase.from("company_members").select("*").eq("profile_id", user.id).eq("status", "ACTIVE").order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (!member) return null;
  const { data: company } = await supabase.from("companies").select("*").eq("id", member.company_id).maybeSingle();
  if (!company) return null;
  return { ...member, company: company as Company } as CurrentMembership;
}

export async function getCurrentCompany() {
  return (await getCurrentMembership())?.company ?? null;
}

export async function requireCompany() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const membership = await getCurrentMembership();
  if (!membership) redirect("/onboarding");
  return membership;
}

export async function requireRole(roles: AppRole[] = ["OWNER", "ADMIN", "MANAGER", "TECHNICIAN", "VIEWER"]) {
  const membership = await requireCompany();
  if (!roles.includes(membership.role_code)) redirect("/dashboard");
  return membership;
}
