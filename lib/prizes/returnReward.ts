import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DrawPrizeResult } from "@/lib/types/database";

// Return-visit reward ("collect-and-win"): on a contact's every Nth completed
// play of a campaign, award a reserved reward prize instead of the normal draw —
// driving repeat visits / frequency.
//
// Server-controlled and sustainable: the reward is claimed atomically through the
// existing claim_prize_by_tier RPC (stock-limited, voucher claimed under
// FOR UPDATE SKIP LOCKED), so it can't be farmed and respects inventory. Set the
// reward prize at a dedicated tier with weight 0 so it never appears in the
// normal weighted draw — only on milestone visits. Requires the campaign to
// allow repeat plays (max_plays_per_player >= target, or 0 for unlimited).

export interface ReturnRewardConfig {
  enabled: boolean;
  target: number; // award on every Nth completed visit (N >= 2)
  tier: number; // prize tier claimed as the reward
}

export function readReturnReward(
  config: Record<string, unknown> | null | undefined,
): ReturnRewardConfig | null {
  const rr = (config?.returnReward ?? null) as Partial<ReturnRewardConfig> | null;
  if (!rr || rr.enabled !== true) return null;
  const target = Number(rr.target);
  if (!Number.isInteger(target) || target < 2) return null;
  const tierNum = Number(rr.tier);
  const tier = Number.isInteger(tierNum) && tierNum >= 1 ? tierNum : 1;
  return { enabled: true, target, tier };
}

// 1-based index of the current (not-yet-completed) play among the contact's plays.
export function visitNumberFromPrior(priorCompleted: number): number {
  return priorCompleted + 1;
}

export function isMilestoneVisit(priorCompleted: number, target: number): boolean {
  const visit = visitNumberFromPrior(priorCompleted);
  return visit >= target && visit % target === 0;
}

export interface ReturnRewardOutcome {
  result: DrawPrizeResult;
  visitNumber: number;
  target: number;
}

interface MaybeArgs {
  campaignId: string;
  playId: string;
  config: Record<string, unknown> | null | undefined;
  email: string | null;
  fingerprint: string | null;
  flagged: boolean;
}

// Returns the claimed reward when this play lands on a milestone visit, else null
// (caller falls back to the normal chance/skill draw). Throws only on RPC error.
export async function maybeClaimReturnReward(args: MaybeArgs): Promise<ReturnRewardOutcome | null> {
  const rr = readReturnReward(args.config);
  if (!rr) return null;
  // Need a stable identity to count visits across the per-play player rows.
  if (!args.email && !args.fingerprint) return null;

  const supabase = createAdminClient();
  const prior = await countPriorCompleted(supabase, args.campaignId, args.email, args.fingerprint);
  if (!isMilestoneVisit(prior, rr.target)) return null;

  const { data, error } = await supabase.rpc("claim_prize_by_tier", {
    p_campaign_id: args.campaignId,
    p_play_id: args.playId,
    p_tier: rr.tier,
    p_flagged: args.flagged,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    result: {
      prize_id: row?.prize_id ?? null,
      voucher_code_id: row?.voucher_code_id ?? null,
      code: row?.code ?? null,
    },
    visitNumber: visitNumberFromPrior(prior),
    target: rr.target,
  };
}

// Count the contact's prior COMPLETED plays in this campaign. The current play is
// still 'started' at this point, so it isn't included. Prefer email; fall back to
// fingerprint when there's no email.
async function countPriorCompleted(
  supabase: SupabaseClient,
  campaignId: string,
  email: string | null,
  fingerprint: string | null,
): Promise<number> {
  if (email) {
    const { count } = await supabase
      .from("plays")
      .select("id, players!inner(email)", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("players.email", email)
      .eq("status", "completed");
    return count ?? 0;
  }
  const { count } = await supabase
    .from("plays")
    .select("id, players!inner(fingerprint)", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("players.fingerprint", fingerprint)
    .eq("status", "completed");
  return count ?? 0;
}
