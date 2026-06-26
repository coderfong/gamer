import type { SupabaseClient } from "@supabase/supabase-js";

// Read-only, single-brand dashboard for the client portal. Everything is filtered
// to one brand_id and read with the service-role client (the client isn't a
// Supabase auth user), so it never leaks the operator's other brands.

export interface PortalCampaign {
  id: string;
  name: string;
  status: string;
  plays: number;
  wins: number;
}

export interface PortalSignup {
  id: string;
  email: string;
  name: string | null;
  game_type: string | null;
  won: boolean | null;
  marketing_consent: boolean;
  created_at: string;
}

export interface BrandDashboard {
  brandName: string;
  stats: {
    campaigns: number;
    plays: number;
    winRate: number | null; // 0..1
    redemptions: number;
    vouchersRemaining: number;
    signups: number;
    consented: number;
  };
  campaigns: PortalCampaign[];
  playsByDay: Array<{ day: string; plays: number }>;
  signups: PortalSignup[];
}

export async function loadBrandDashboard(
  admin: SupabaseClient,
  brandId: string,
): Promise<BrandDashboard | null> {
  const { data: brand } = await admin.from("brands").select("name").eq("id", brandId).maybeSingle();
  if (!brand) return null;

  const { data: campaignRows } = await admin
    .from("campaigns")
    .select("id, name, status")
    .eq("brand_id", brandId);
  const campaigns = (campaignRows ?? []) as Array<{ id: string; name: string; status: string }>;
  const campaignIds = campaigns.map((c) => c.id);

  const lossPrizeIds = new Set<string>();
  let vouchersRemaining = 0;
  const playsByCampaign = new Map<string, { plays: number; wins: number }>();
  const redeemedPlayIds = new Set<string>();
  const playsByDay = new Map<string, number>();

  if (campaignIds.length > 0) {
    const { data: prizeRows } = await admin
      .from("prizes")
      .select("id, is_loss, stock_remaining")
      .in("campaign_id", campaignIds);
    for (const p of (prizeRows ?? []) as Array<{ id: string; is_loss: boolean; stock_remaining: number | null }>) {
      if (p.is_loss) lossPrizeIds.add(p.id);
      else if (p.stock_remaining !== null) vouchersRemaining += p.stock_remaining;
    }

    const { data: playRows } = await admin
      .from("plays")
      .select("id, campaign_id, prize_id, completed_at, started_at")
      .in("campaign_id", campaignIds)
      .eq("status", "completed");
    const plays = (playRows ?? []) as Array<{ id: string; campaign_id: string; prize_id: string | null; completed_at: string | null; started_at: string }>;

    for (const pl of plays) {
      const agg = playsByCampaign.get(pl.campaign_id) ?? { plays: 0, wins: 0 };
      agg.plays += 1;
      if (pl.prize_id && !lossPrizeIds.has(pl.prize_id)) agg.wins += 1;
      playsByCampaign.set(pl.campaign_id, agg);
      const day = (pl.completed_at ?? pl.started_at).slice(0, 10);
      playsByDay.set(day, (playsByDay.get(day) ?? 0) + 1);
    }

    const playIds = plays.map((p) => p.id);
    if (playIds.length > 0) {
      const { data: vcs } = await admin
        .from("voucher_codes")
        .select("claimed_by_play_id, redeemed_at")
        .in("claimed_by_play_id", playIds)
        .not("redeemed_at", "is", null);
      for (const v of (vcs ?? []) as Array<{ claimed_by_play_id: string | null }>) {
        if (v.claimed_by_play_id) redeemedPlayIds.add(v.claimed_by_play_id);
      }
    }
  }

  const { data: signupRows } = await admin
    .from("brand_signups")
    .select("id, email, name, game_type, won, marketing_consent, created_at")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false })
    .limit(2000);
  const signups = (signupRows ?? []) as PortalSignup[];

  const portalCampaigns: PortalCampaign[] = campaigns.map((c) => {
    const agg = playsByCampaign.get(c.id) ?? { plays: 0, wins: 0 };
    return { id: c.id, name: c.name, status: c.status, plays: agg.plays, wins: agg.wins };
  });

  const totalPlays = portalCampaigns.reduce((s, c) => s + c.plays, 0);
  const totalWins = portalCampaigns.reduce((s, c) => s + c.wins, 0);

  // Last 30 days, ascending.
  const days: Array<{ day: string; plays: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    days.push({ day: d, plays: playsByDay.get(d) ?? 0 });
  }

  return {
    brandName: (brand as { name: string }).name,
    stats: {
      campaigns: campaigns.length,
      plays: totalPlays,
      winRate: totalPlays > 0 ? totalWins / totalPlays : null,
      redemptions: redeemedPlayIds.size,
      vouchersRemaining,
      signups: signups.length,
      consented: signups.filter((s) => s.marketing_consent).length,
    },
    campaigns: portalCampaigns,
    playsByDay: days,
    signups,
  };
}
