import { createClient } from "@/lib/supabase/server";

export interface BrandRow {
  id: string;
  name: string;
  subscription_tier: "pilot" | "active" | "suspended";
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
}

// Returns the account's primary (oldest) brand, or null. An account can own
// several brands now; callers that just need "a brand" for the account get the
// first one. RLS already scopes brands to owner_id = auth.uid().
export async function getCurrentBrand(): Promise<BrandRow | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("brands")
    .select("id, name, subscription_tier, contact_email, contact_phone, notes")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (data as BrandRow) ?? null;
}
