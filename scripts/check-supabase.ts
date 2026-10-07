import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

function getSupabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!value) throw new Error("Supabase URL is missing.");
  return value.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
}

async function main() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) throw new Error("Supabase connection variables are missing.");
  const { data, error } = await createClient<Database>(getSupabaseUrl(), secretKey, { auth: { autoRefreshToken: false, persistSession: false } })
    .from("user_roles")
    .select("code")
    .order("code")
    .limit(1);
  if (error) throw new Error(`Supabase connection failed: ${error.message}`);
  console.log(`Supabase responded successfully (sample rows: ${data?.length ?? 0}).`);
}

void main();
