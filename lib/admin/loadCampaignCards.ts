import type { SupabaseClient } from "@supabase/supabase-js";
import type { CampaignCardData } from "@/components/admin/CampaignCard";
import type { CampaignStatus } from "@/lib/types/database";
import { playUrl } from "@/lib/play/qrToken";

interface PrizeLite {
  id: string;
  is_loss: boolean;
  stock_remaining: number | null;
}
interface CampaignWithPrizes {
  id: string;
  slug: string;
  name: string;
  game_type: string;
  status: CampaignStatus;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  prizes: PrizeLite[];
}

export interface CampaignCardsResult {
  cards: CampaignCardData[];
  createdAtById: Map<string, string>;
  error: boolean;
}

// Loads the current brand's campaigns (RLS-scoped) and computes per-card stats:
// plays_count, win_rate, vouchers_remaining. Shared by /dashboard and /campaigns.
export async function loadCampaignCards(
  supabase: SupabaseClient,
): Promise<CampaignCardsResult> {
  const { data: campaignRows, error: campaignsErr } = await supabase
    .from("campaigns")
    .select(
      "id, slug, name, game_type, status, starts_at, ends_at, created_at, prizes(id, is_loss, stock_remaining)",
    )
    .order("created_at", { ascending: false });

  const campaigns = (campaignRows ?? []) as unknown as CampaignWithPrizes[];

  let plays: Array<{ campaign_id: string; prize_id: string | null }> = [];
  if (campaigns.length > 0) {
    const { data: playRows } = await supabase
      .from("plays")
      .select("campaign_id, prize_id")
      .in(
        "campaign_id",
        campaigns.map((c) => c.id),
      )
      .eq("status", "completed");
    plays = (playRows ?? []) as Array<{ campaign_id: string; prize_id: string | null }>;
  }

  const lossPrizeIds = new Set<string>();
  for (const c of campaigns) for (const p of c.prizes) if (p.is_loss) lossPrizeIds.add(p.id);

  const playsByCampaign = new Map<string, { total: number; wins: number }>();
  for (const play of plays) {
    const agg = playsByCampaign.get(play.campaign_id) ?? { total: 0, wins: 0 };
    agg.total += 1;
    if (play.prize_id && !lossPrizeIds.has(play.prize_id)) agg.wins += 1;
    playsByCampaign.set(play.campaign_id, agg);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const cards: CampaignCardData[] = campaigns.map((c) => {
    const agg = playsByCampaign.get(c.id) ?? { total: 0, wins: 0 };
    const vouchers = c.prizes
      .filter((p) => !p.is_loss && p.stock_remaining !== null)
      .reduce((sum, p) => sum + (p.stock_remaining ?? 0), 0);
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      game_type: c.game_type,
      status: c.status,
      starts_at: c.starts_at,
      ends_at: c.ends_at,
      plays_count: agg.total,
      win_rate: agg.total > 0 ? agg.wins / agg.total : null,
      vouchers_remaining: vouchers,
      play_url: playUrl(appUrl, c.slug),
    };
  });

  return {
    cards,
    createdAtById: new Map(campaigns.map((c) => [c.id, c.created_at])),
    error: Boolean(campaignsErr),
  };
}
