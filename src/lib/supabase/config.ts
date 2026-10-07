export function getSupabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!value) throw new Error("Supabase URL is missing.");
  return value.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
}

export function getSupabasePublishableKey() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!value) throw new Error("Supabase publishable key is missing.");
  return value;
}
