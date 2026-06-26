import type { SupabaseClient } from "@supabase/supabase-js";

// Compounding ROI metrics — the numbers that GROW with client tenure, so the
// dashboard makes cancelling feel like walking away from a growing asset:
//   * customer-list growth  — cumulative unique customers acquired over time
//   * repeat-visit rate     — share of customers (to date) with 2+ completed plays
//   * redemptions/customer  — cumulative redemptions ÷ cumulative customers
//
// Owner-scoped via the RLS server client (players/plays/vouchers); leads added via
// the admin client (agency-global, RLS-private) — same split as the Customer view.
// Customers are deduped by contact (email, else phone) so the same person across
// campaigns counts once.

export interface RoiPoint {
  month: string; // "YYYY-MM"
  label: string; // "Jun 2026"
  cumulativeCustomers: number;
  repeatRatePct: number; // 0..100
  redemptionsPerCustomer: number;
}

export interface RoiMetrics {
  series: RoiPoint[];
  totals: {
    customers: number;
    repeatRatePct: number;
    redemptionsPerCustomer: number;
    monthsTracked: number;
  };
  error: boolean;
}

interface Contact {
  firstMonth: string;
  playMonths: Map<string, number>; // month -> completed plays that month
  redemptionMonths: Map<string, number>;
}

const monthKey = (iso: string) => iso.slice(0, 7); // "YYYY-MM"

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-SG", { month: "short", year: "numeric" });
}

function monthRange(min: string, max: string): string[] {
  const out: string[] = [];
  let [y, m] = min.split("-").map(Number);
  const [my, mm] = max.split("-").map(Number);
  while (y < my || (y === my && m <= mm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

function contactKey(email: string | null, phone: string | null, fallback: string): string {
  if (email && email.trim()) return "e:" + email.trim().toLowerCase();
  if (phone && phone.trim()) return "p:" + phone.replace(/\s+/g, "");
  return "id:" + fallback;
}

export async function loadRoiMetrics(
  supabase: SupabaseClient,
  admin: SupabaseClient,
): Promise<RoiMetrics> {
  let error = false;
  const contacts = new Map<string, Contact>();

  const ensure = (key: string, firstSeen: string): Contact => {
    let c = contacts.get(key);
    if (!c) {
      c = { firstMonth: monthKey(firstSeen), playMonths: new Map(), redemptionMonths: new Map() };
      contacts.set(key, c);
    } else if (monthKey(firstSeen) < c.firstMonth) {
      c.firstMonth = monthKey(firstSeen);
    }
    return c;
  };
  const bump = (m: Map<string, number>, key: string) => m.set(key, (m.get(key) ?? 0) + 1);

  const { data: campaignRows, error: cErr } = await supabase.from("campaigns").select("id");
  if (cErr) error = true;
  const campaignIds = ((campaignRows ?? []) as Array<{ id: string }>).map((c) => c.id);

  // playerId -> contact key, for attributing plays/redemptions.
  const playerKey = new Map<string, string>();

  if (campaignIds.length > 0) {
    const { data: playerRows, error: pErr } = await supabase
      .from("players")
      .select("id, email, phone, created_at")
      .in("campaign_id", campaignIds);
    if (pErr) error = true;
    for (const p of (playerRows ?? []) as Array<{ id: string; email: string | null; phone: string | null; created_at: string }>) {
      const key = contactKey(p.email, p.phone, p.id);
      playerKey.set(p.id, key);
      ensure(key, p.created_at);
    }

    const { data: playRows } = await supabase
      .from("plays")
      .select("id, player_id, status, started_at, completed_at")
      .in("campaign_id", campaignIds)
      .eq("status", "completed");
    const plays = (playRows ?? []) as Array<{ id: string; player_id: string | null; started_at: string; completed_at: string | null }>;
    const playMonthById = new Map<string, { key: string; month: string }>();
    for (const pl of plays) {
      if (!pl.player_id) continue;
      const key = playerKey.get(pl.player_id);
      if (!key) continue;
      const month = monthKey(pl.completed_at ?? pl.started_at);
      const c = contacts.get(key);
      if (c) bump(c.playMonths, month);
      playMonthById.set(pl.id, { key, month });
    }

    // Redemptions: a play's claimed voucher marked redeemed → credit the contact
    // in the redemption's month.
    const playIds = plays.map((p) => p.id);
    if (playIds.length > 0) {
      const { data: vcs } = await supabase
        .from("voucher_codes")
        .select("claimed_by_play_id, redeemed_at")
        .in("claimed_by_play_id", playIds)
        .not("redeemed_at", "is", null);
      for (const v of (vcs ?? []) as Array<{ claimed_by_play_id: string | null; redeemed_at: string | null }>) {
        if (!v.claimed_by_play_id || !v.redeemed_at) continue;
        const ref = playMonthById.get(v.claimed_by_play_id);
        if (!ref) continue;
        const c = contacts.get(ref.key);
        if (c) bump(c.redemptionMonths, monthKey(v.redeemed_at));
      }
    }
  }

  // Leads (agency-global). Folded in by contact; contribute to list growth.
  const { data: leadRows, error: lErr } = await admin
    .from("leads")
    .select("email, phone, created_at");
  if (lErr) error = true;
  for (const l of (leadRows ?? []) as Array<{ email: string | null; phone: string | null; created_at: string }>) {
    ensure(contactKey(l.email, l.phone, l.created_at), l.created_at);
  }

  if (contacts.size === 0) {
    return { series: [], totals: { customers: 0, repeatRatePct: 0, redemptionsPerCustomer: 0, monthsTracked: 0 }, error };
  }

  // Build the month axis from earliest acquisition to the current month.
  let minMonth = "9999-12";
  for (const c of contacts.values()) if (c.firstMonth < minMonth) minMonth = c.firstMonth;
  const nowMonth = monthKey(new Date().toISOString());
  const maxMonth = nowMonth > minMonth ? nowMonth : minMonth;
  const months = monthRange(minMonth, maxMonth);

  // Walk months once, accumulating running per-contact play counts so repeat-rate
  // and redemptions/customer are true running (cumulative) figures.
  const running = new Map<string, number>();
  let cumulativeCustomers = 0;
  let repeatCount = 0;
  let cumulativeRedemptions = 0;

  const series: RoiPoint[] = months.map((month) => {
    for (const [key, c] of contacts) {
      if (c.firstMonth === month) cumulativeCustomers += 1;
      const add = c.playMonths.get(month) ?? 0;
      if (add > 0) {
        const before = running.get(key) ?? 0;
        const after = before + add;
        running.set(key, after);
        if (before < 2 && after >= 2) repeatCount += 1;
      }
      cumulativeRedemptions += c.redemptionMonths.get(month) ?? 0;
    }
    return {
      month,
      label: monthLabel(month),
      cumulativeCustomers,
      repeatRatePct: cumulativeCustomers ? Math.round((repeatCount / cumulativeCustomers) * 1000) / 10 : 0,
      redemptionsPerCustomer: cumulativeCustomers ? Math.round((cumulativeRedemptions / cumulativeCustomers) * 100) / 100 : 0,
    };
  });

  const last = series[series.length - 1];
  return {
    series,
    totals: {
      customers: last.cumulativeCustomers,
      repeatRatePct: last.repeatRatePct,
      redemptionsPerCustomer: last.redemptionsPerCustomer,
      monthsTracked: series.length,
    },
    error,
  };
}
