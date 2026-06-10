import { createAdminClient } from "@/lib/supabase/admin";
import { pickTierForScore, type WinThreshold } from "./skillScoreLookup";
import type { DrawPrizeResult } from "@/lib/types/database";

// Game types that resolve a prize from a score rather than weighted chance.
// Kept in sync with the submit route's SKILL_GAMES.
const SKILL_GAMES = new Set(["quiz"]);

interface PreviewPrize {
  id: string;
  weight: number;
  is_loss: boolean;
  stock_remaining: number | null;
  tier: number;
}

const inStock = (p: PreviewPrize) => p.stock_remaining === null || p.stock_remaining > 0;

/**
 * Read-only mirror of draw_prize_atomic / claim_prize_by_tier for preview mode.
 * Picks a realistic outcome WITHOUT writing anything — no stock decrement, no
 * voucher claim, no play/player rows. Returns a sample (still-unclaimed) code
 * just so the result screen looks real.
 */
export async function previewDraw(args: {
  campaignId: string;
  gameType: string;
  score?: number;
  config: Record<string, unknown>;
}): Promise<DrawPrizeResult> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("prizes")
    .select("id, weight, is_loss, stock_remaining, tier")
    .eq("campaign_id", args.campaignId);
  const prizes = (data ?? []) as PreviewPrize[];

  let chosen: PreviewPrize | null = null;

  // 1. Skill games: score -> tier via win_thresholds.
  if (SKILL_GAMES.has(args.gameType) && typeof args.score === "number") {
    const thresholds = (args.config?.win_thresholds as WinThreshold[] | undefined) ?? [];
    const tier = pickTierForScore(thresholds, args.score) ?? 9;
    chosen = prizes.find((p) => p.tier === tier && inStock(p)) ?? null;
  }

  // 2. Weighted random for chance games.
  if (!chosen) {
    const pool = prizes.filter((p) => !p.is_loss && p.weight > 0 && inStock(p));
    const total = pool.reduce((s, p) => s + p.weight, 0);
    if (total > 0) {
      let pick = Math.random() * total;
      for (const p of pool) {
        pick -= p.weight;
        if (pick < 0) {
          chosen = p;
          break;
        }
      }
    }
  }

  // 3. Loss fallback.
  if (!chosen) chosen = prizes.find((p) => p.is_loss) ?? null;

  // Sample voucher code for display only — never marked claimed.
  let code: string | null = null;
  if (chosen && !chosen.is_loss) {
    const { data: vc } = await supabase
      .from("voucher_codes")
      .select("code")
      .eq("prize_id", chosen.id)
      .is("claimed_at", null)
      .limit(1)
      .maybeSingle();
    code = vc?.code ?? null;
  }

  return { prize_id: chosen?.id ?? null, voucher_code_id: null, code };
}
