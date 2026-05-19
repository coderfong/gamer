import type { PrizeRow } from "@/lib/types/database";

/**
 * Pure helper: given a list of prizes and a score, return the best-matching tier.
 * The SQL RPC does this server-side too; this helper exists for previews
 * (e.g. admin "test draw" UI) and unit tests.
 */
export function pickPrizeByScore(prizes: PrizeRow[], score: number): PrizeRow | null {
  const eligible = prizes
    .filter(
      (p) =>
        p.min_score != null &&
        score >= p.min_score &&
        score <= (p.max_score ?? Number.MAX_SAFE_INTEGER) &&
        (p.stock_remaining == null || p.stock_remaining > 0),
    )
    .sort((a, b) => a.tier - b.tier);
  return eligible[0] ?? null;
}
