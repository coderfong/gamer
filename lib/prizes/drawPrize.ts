import { createAdminClient } from "@/lib/supabase/admin";
import type { DrawPrizeResult } from "@/lib/types/database";

/**
 * Atomic chance-game prize draw. Calls the SQL RPC `draw_prize_atomic`.
 * When `flagged=true`, the RPC still picks a prize but skips stock decrement
 * and voucher claim, and sets play.status='flagged'.
 */
export async function drawPrize(args: {
  campaignId: string;
  playId: string;
  score?: number;
  flagged?: boolean;
}): Promise<DrawPrizeResult> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("draw_prize_atomic", {
    p_campaign_id: args.campaignId,
    p_play_id: args.playId,
    p_score: args.score ?? null,
    p_flagged: args.flagged ?? false,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    prize_id: row?.prize_id ?? null,
    voucher_code_id: row?.voucher_code_id ?? null,
    code: row?.code ?? null,
  };
}
