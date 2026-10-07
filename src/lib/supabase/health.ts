import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export async function checkSupabaseConnection() {
  const { data, error } = await createAdminClient().from("user_roles").select("code").order("code").limit(1);
  if (error) throw new Error(`Supabase connection failed: ${error.message}`);
  return { ok: true, rows: data?.length ?? 0 };
}
