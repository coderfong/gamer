import { createAdminClient } from "@/lib/supabase/admin";
import type { DrawPrizeResult } from "@/lib/types/database";

export interface WinThreshold {
  min_score: number;
  prize_tier: number;
}

/**
 * Pick the highest tier the player qualifies for, based on
 * campaign.config.win_thresholds. Returns the prize_tier number or null
 * if no threshold matched (caller may fall back to loss prize).
 */
export function pickTierForScore(
  thresholds: WinThreshold[],
  score: number,
): number | null {
  if (!Array.isArray(thresholds) || thresholds.length === 0) return null;
  const sorted = [...thresholds].sort((a, b) => b.min_score - a.min_score);
  for (const t of sorted) {
    if (score >= t.min_score) return t.prize_tier;
  }
  return null;
}

/**
 * Skill-game prize claim:
 *   1. Read campaign.config.win_thresholds
 *   2. Map score → tier
 *   3. Call claim_prize_by_tier RPC (atomic; honors p_flagged)
 */
export async function lookupAndClaim(args: {
  campaignId: string;
  playId: string;
  score: number;
  flagged?: boolean;
}): Promise<DrawPrizeResult> {
  const supabase = createAdminClient();

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("config")
    .eq("id", args.campaignId)
    .maybeSingle();
  if (error) throw error;
  if (!campaign) throw new Error("campaign_not_found");

  const config = (campaign.config ?? {}) as { win_thresholds?: WinThreshold[] };
  const tier = pickTierForScore(config.win_thresholds ?? [], args.score);

  // If nothing matched, hand a tier the caller has explicitly marked as loss
  // via prizes.is_loss=true and tier 9 (matches our seed convention).
  const effectiveTier = tier ?? 9;

  const { data, error: rpcErr } = await supabase.rpc("claim_prize_by_tier", {
    p_campaign_id: args.campaignId,
    p_play_id: args.playId,
    p_tier: effectiveTier,
    p_flagged: args.flagged ?? false,
  });
  if (rpcErr) throw rpcErr;

  const row = Array.isArray(data) ? data[0] : data;
  return {
    prize_id: row?.prize_id ?? null,
    voucher_code_id: row?.voucher_code_id ?? null,
    code: row?.code ?? null,
  };
}
