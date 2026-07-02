import type { SupabaseClient } from "@supabase/supabase-js";

export interface LoyaltyStats {
  members: number;
  activeCards: number;
  vouchersOutstanding: number; // active (unredeemed) vouchers
  redemptions: number;         // redeemed vouchers
}

// Lightweight loyalty counters for one brand, using head/count queries.
export async function loadLoyaltyStats(admin: SupabaseClient, brandId: string): Promise<LoyaltyStats> {
  const head = { count: "exact" as const, head: true };
  const [m, c, vOut, vRed] = await Promise.all([
    admin.from("loyalty_members").select("id", head).eq("brand_id", brandId),
    admin.from("loyalty_cards").select("id", head).eq("brand_id", brandId).eq("status", "active"),
    admin.from("loyalty_vouchers").select("id", head).eq("brand_id", brandId).eq("status", "active"),
    admin.from("loyalty_vouchers").select("id", head).eq("brand_id", brandId).eq("status", "redeemed"),
  ]);
  return {
    members: m.count ?? 0,
    activeCards: c.count ?? 0,
    vouchersOutstanding: vOut.count ?? 0,
    redemptions: vRed.count ?? 0,
  };
}
