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
    activeCampaigns: number;
    plays: number;
    uniqueCustomers: number;
    repeatRate: number | null; // 0..1 — share of customers with 2+ plays
    winRate: number | null; // 0..1
    redemptions: number;
    redemptionRate: number | null; // 0..1 — redemptions / wins
    vouchersRemaining: number;
    signups: number;
    consented: number;
  };
  campaigns: PortalCampaign[];
  playsByDay: Array<{ day: string; plays: number }>;
  signupsByDay: Array<{ day: string; signups: number }>;
  prizeBreakdown: Array<{ name: string; count: number }>;
  signups: PortalSignup[];
}

const DAY = 86_400_000;
const contactKey = (email: string | null, phone: string | null, fallback: string) =>
  email?.trim() ? "e:" + email.trim().toLowerCase() : phone?.trim() ? "p:" + phone.replace(/\s+/g, "") : "id:" + fallback;

// Last 30 calendar days (ascending) with the count from `map`, 0-filled.
function last30(map: Map<string, number>): Array<{ day: string; value: number }> {
  const out: Array<{ day: string; value: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY).toISOString().slice(0, 10);
    out.push({ day: d, value: map.get(d) ?? 0 });
  }
  return out;
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
  const prizeName = new Map<string, string>();
  let vouchersRemaining = 0;
  const playsByCampaign = new Map<string, { plays: number; wins: number }>();
  const redeemedPlayIds = new Set<string>();
  const playsByDay = new Map<string, number>();
  const prizeCounts = new Map<string, number>();
  const playsByContact = new Map<string, number>();
  let totalWins = 0;

  if (campaignIds.length > 0) {
    const { data: prizeRows } = await admin
      .from("prizes")
      .select("id, name, is_loss, stock_remaining")
      .in("campaign_id", campaignIds);
    for (const p of (prizeRows ?? []) as Array<{ id: string; name: string; is_loss: boolean; stock_remaining: number | null }>) {
      prizeName.set(p.id, p.name);
      if (p.is_loss) lossPrizeIds.add(p.id);
      else if (p.stock_remaining !== null) vouchersRemaining += p.stock_remaining;
    }

    // Players → contact identity (for unique-customer + repeat-rate).
    const { data: playerRows } = await admin
      .from("players")
      .select("id, email, phone")
      .in("campaign_id", campaignIds);
    const playerContact = new Map<string, string>();
    for (const p of (playerRows ?? []) as Array<{ id: string; email: string | null; phone: string | null }>) {
      playerContact.set(p.id, contactKey(p.email, p.phone, p.id));
    }

    const { data: playRows } = await admin
      .from("plays")
      .select("id, campaign_id, player_id, prize_id, completed_at, started_at")
      .in("campaign_id", campaignIds)
      .eq("status", "completed");
    const plays = (playRows ?? []) as Array<{ id: string; campaign_id: string; player_id: string | null; prize_id: string | null; completed_at: string | null; started_at: string }>;

    for (const pl of plays) {
      const agg = playsByCampaign.get(pl.campaign_id) ?? { plays: 0, wins: 0 };
      agg.plays += 1;
      const isWin = !!pl.prize_id && !lossPrizeIds.has(pl.prize_id);
      if (isWin) { agg.wins += 1; totalWins += 1; }
      playsByCampaign.set(pl.campaign_id, agg);
      const day = (pl.completed_at ?? pl.started_at).slice(0, 10);
      playsByDay.set(day, (playsByDay.get(day) ?? 0) + 1);
      if (pl.prize_id && isWin) prizeCounts.set(pl.prize_id, (prizeCounts.get(pl.prize_id) ?? 0) + 1);
      if (pl.player_id) {
        const key = playerContact.get(pl.player_id) ?? pl.player_id;
        playsByContact.set(key, (playsByContact.get(key) ?? 0) + 1);
      }
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
    .select("id, email, name, game_type, won, marketing_consent, redeemed_at, created_at")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false })
    .limit(2000);
  const signups = (signupRows ?? []) as Array<PortalSignup & { redeemed_at: string | null }>;
  const hubRedemptions = signups.filter((s) => s.redeemed_at).length;
  const signupsByDayMap = new Map<string, number>();
  for (const s of signups) {
    const day = s.created_at.slice(0, 10);
    signupsByDayMap.set(day, (signupsByDayMap.get(day) ?? 0) + 1);
  }

  const portalCampaigns: PortalCampaign[] = campaigns.map((c) => {
    const agg = playsByCampaign.get(c.id) ?? { plays: 0, wins: 0 };
    return { id: c.id, name: c.name, status: c.status, plays: agg.plays, wins: agg.wins };
  });

  const totalPlays = portalCampaigns.reduce((s, c) => s + c.plays, 0);
  const uniqueCustomers = playsByContact.size;
  const repeatCustomers = Array.from(playsByContact.values()).filter((n) => n >= 2).length;

  const prizeBreakdown = Array.from(prizeCounts.entries())
    .map(([id, count]) => ({ name: prizeName.get(id) ?? "Prize", count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    brandName: (brand as { name: string }).name,
    stats: {
      campaigns: campaigns.length,
      activeCampaigns: campaigns.filter((c) => c.status === "active").length,
      plays: totalPlays,
      uniqueCustomers,
      repeatRate: uniqueCustomers > 0 ? repeatCustomers / uniqueCustomers : null,
      winRate: totalPlays > 0 ? totalWins / totalPlays : null,
      redemptions: redeemedPlayIds.size + hubRedemptions,
      redemptionRate: totalWins > 0 ? redeemedPlayIds.size / totalWins : null,
      vouchersRemaining,
      signups: signups.length,
      consented: signups.filter((s) => s.marketing_consent).length,
    },
    campaigns: portalCampaigns,
    playsByDay: last30(playsByDay).map((d) => ({ day: d.day, plays: d.value })),
    signupsByDay: last30(signupsByDayMap).map((d) => ({ day: d.day, signups: d.value })),
    prizeBreakdown,
    signups,
  };
}
