import { createClient } from "@/lib/supabase/server";

// Preview-mode guard for the player API routes. Returns true only when the
// request carries a valid session AND that user owns the campaign (RLS on
// campaigns only returns rows whose brand.owner_id = auth.uid()). This stops
// anonymous bots from probing prize logic via ?preview=1.
export async function ownsCampaignBySlug(slug: string): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("campaigns")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return Boolean(data);
}
