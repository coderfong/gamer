import { createAdminClient } from "@/lib/supabase/admin";
import type { DrawPrizeResult } from "@/lib/types/database";

/**
 * Resolve a play to a prize + voucher code using the SQL RPC `draw_prize`.
 * Atomic on the DB side: stock decrement and voucher claim happen in one txn.
 */
export async function drawPrize(args: {
  campaignId: string;
  playId: string;
  score?: number;
}): Promise<DrawPrizeResult> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("draw_prize", {
    p_campaign_id: args.campaignId,
    p_play_id: args.playId,
    p_score: args.score ?? null,
  });
  if (error) throw error;

  // Postgres functions returning TABLE come back as an array of rows.
  const row = Array.isArray(data) ? data[0] : data;
  return {
    prize_id: row?.prize_id ?? null,
    voucher_code_id: row?.voucher_code_id ?? null,
    code: row?.code ?? null,
  };
}
