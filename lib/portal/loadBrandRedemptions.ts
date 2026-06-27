import type { SupabaseClient } from "@supabase/supabase-js";

export interface RedemptionRow {
  code: string;
  prizeName: string | null;
  redeemedAt: string;
  contact: string | null;
}

// Recent redeemed vouchers for a brand (voucher → prize → campaign → brand_id),
// newest first. Captures every redemption (portal scan or admin), since it reads
// voucher_codes.redeemed_at.
export async function loadBrandRedemptions(
  admin: SupabaseClient,
  brandId: string,
  limit = 50,
): Promise<RedemptionRow[]> {
  const { data } = await admin
    .from("voucher_codes")
    .select("code, redeemed_at, claimed_by_play_id, prizes!inner(name, campaigns!inner(brand_id))")
    .eq("prizes.campaigns.brand_id", brandId)
    .not("redeemed_at", "is", null)
    .order("redeemed_at", { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as Array<{
    code: string;
    redeemed_at: string;
    claimed_by_play_id: string | null;
    prizes: { name: string } | { name: string }[] | null;
  }>;

  // Batch the customer contact for the linked plays.
  const playIds = rows.map((r) => r.claimed_by_play_id).filter((id): id is string => !!id);
  const contactByPlay = new Map<string, string>();
  if (playIds.length > 0) {
    const { data: plays } = await admin.from("plays").select("id, players(email, phone)").in("id", playIds);
    for (const p of (plays ?? []) as Array<{ id: string; players: { email: string | null; phone: string | null } | { email: string | null; phone: string | null }[] | null }>) {
      const pl = Array.isArray(p.players) ? p.players[0] : p.players;
      const c = pl?.email || pl?.phone || null;
      if (c) contactByPlay.set(p.id, c);
    }
  }

  const campaignRedemptions: RedemptionRow[] = rows.map((r) => {
    const prize = Array.isArray(r.prizes) ? r.prizes[0] : r.prizes;
    return {
      code: r.code,
      prizeName: prize?.name ?? null,
      redeemedAt: r.redeemed_at,
      contact: r.claimed_by_play_id ? contactByPlay.get(r.claimed_by_play_id) ?? null : null,
    };
  });

  // Play-hub vouchers (redeemed) for this brand.
  const { data: hubRows } = await admin
    .from("brand_signups")
    .select("voucher_code, prize_label, email, redeemed_at")
    .eq("brand_id", brandId)
    .not("redeemed_at", "is", null)
    .order("redeemed_at", { ascending: false })
    .limit(limit);
  const hubRedemptions: RedemptionRow[] = ((hubRows ?? []) as Array<{ voucher_code: string | null; prize_label: string | null; email: string; redeemed_at: string }>)
    .filter((h) => h.voucher_code)
    .map((h) => ({ code: h.voucher_code as string, prizeName: h.prize_label, redeemedAt: h.redeemed_at, contact: h.email }));

  return [...campaignRedemptions, ...hubRedemptions]
    .sort((a, b) => b.redeemedAt.localeCompare(a.redeemedAt))
    .slice(0, limit);
}
