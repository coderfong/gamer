import type { SupabaseClient } from "@supabase/supabase-js";

// Find a voucher by code, but ONLY within the given brand (voucher → prize →
// campaign → brand_id). Returns null if it isn't this brand's voucher, so the
// client portal can never see or redeem another brand's codes.
export interface VoucherLookup {
  id: string;
  code: string;
  prizeName: string | null;
  claimed: boolean;
  redeemed: boolean;
  redeemedAt: string | null;
  wonAt: string | null;
  contact: string | null;
}

export async function lookupBrandVoucher(
  admin: SupabaseClient,
  brandId: string,
  code: string,
): Promise<VoucherLookup | null> {
  const { data: voucher } = await admin
    .from("voucher_codes")
    .select("id, code, claimed_at, redeemed_at, claimed_by_play_id, prizes!inner(name, campaigns!inner(brand_id))")
    .eq("code", code)
    .eq("prizes.campaigns.brand_id", brandId)
    .maybeSingle();
  if (!voucher) return null;

  const prize = (Array.isArray(voucher.prizes) ? voucher.prizes[0] : voucher.prizes) as { name: string } | null;

  let wonAt: string | null = null;
  let contact: string | null = null;
  if (voucher.claimed_by_play_id) {
    const { data: play } = await admin
      .from("plays")
      .select("completed_at, players(email, phone)")
      .eq("id", voucher.claimed_by_play_id)
      .maybeSingle();
    if (play) {
      const player = (Array.isArray(play.players) ? play.players[0] : play.players) as
        | { email: string | null; phone: string | null }
        | null;
      wonAt = (play as { completed_at: string | null }).completed_at;
      contact = player?.email || player?.phone || null;
    }
  }

  return {
    id: voucher.id,
    code: voucher.code,
    prizeName: prize?.name ?? null,
    claimed: Boolean(voucher.claimed_at),
    redeemed: Boolean(voucher.redeemed_at),
    redeemedAt: (voucher as { redeemed_at: string | null }).redeemed_at,
    wonAt,
    contact,
  };
}
