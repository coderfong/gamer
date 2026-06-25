import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeadRow, PlayerRow } from "@/lib/types/database";

// The unified per-operator Customer database (the Phase 2 "moat"): every captured
// contact — game players AND book-a-call leads — deduped by contact, with the
// engagement history a re-engagement broadcast (Phase 3) needs.
//
// Scoping: players/plays/campaigns are read with the RLS-scoped server client, so
// this naturally returns only the signed-in owner's data (across all their
// brands). Leads have no brand_id and RLS denies authenticated reads, so they're
// read with the service-role admin client after the page authenticates the user —
// matching how /leads already works. Brand is surfaced per-customer as an
// attribute, not a hard scope.

export type CustomerSegment = "all" | "winners" | "repeat" | "lapsed" | "consented";

export const LAPSED_DAYS = 30;

export interface CustomerRow {
  /** Dedup key: lower(email), else normalized phone, else a player/lead id. */
  key: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  plays: number;
  wins: number;
  redemptions: number;
  firstSeen: string | null;
  lastSeen: string | null;
  marketingConsent: boolean;
  marketingConsentAt: string | null;
  /** Also captured via the "Book a call" form. */
  isLead: boolean;
  leadCompany: string | null;
  leadMessage: string | null;
  /** Brand names this customer played a campaign for (empty for lead-only rows). */
  brandNames: string[];
}

export interface CustomerSegmentCounts {
  all: number;
  winners: number;
  repeat: number;
  lapsed: number;
  consented: number;
}

export interface CustomersResult {
  customers: CustomerRow[];
  counts: CustomerSegmentCounts;
  error: boolean;
}

type Mutable = CustomerRow & { brandSet: Set<string> };

function contactKey(email: string | null, phone: string | null, fallbackId: string): string {
  if (email && email.trim()) return "e:" + email.trim().toLowerCase();
  if (phone && phone.trim()) return "p:" + phone.replace(/\s+/g, "");
  return "id:" + fallbackId;
}

function minIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}
function maxIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

interface PlayLite {
  id: string;
  campaign_id: string;
  player_id: string | null;
  prize_id: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
}

export async function loadCustomers(
  supabase: SupabaseClient,
  admin: SupabaseClient,
): Promise<CustomersResult> {
  const map = new Map<string, Mutable>();
  let error = false;

  const blank = (key: string): Mutable => ({
    key,
    name: null,
    email: null,
    phone: null,
    plays: 0,
    wins: 0,
    redemptions: 0,
    firstSeen: null,
    lastSeen: null,
    marketingConsent: false,
    marketingConsentAt: null,
    isLead: false,
    leadCompany: null,
    leadMessage: null,
    brandNames: [],
    brandSet: new Set<string>(),
  });

  const noteConsent = (c: Mutable, consent: boolean, at: string | null) => {
    if (!consent) return;
    c.marketingConsent = true;
    if (at && (!c.marketingConsentAt || at > c.marketingConsentAt)) c.marketingConsentAt = at;
  };

  // 1. Owner's campaigns + brand attribution.
  const { data: campaignRows, error: cErr } = await supabase
    .from("campaigns")
    .select("id, name, brand_id");
  if (cErr) error = true;
  const campaigns = (campaignRows ?? []) as Array<{ id: string; name: string; brand_id: string | null }>;
  const campaignIds = campaigns.map((c) => c.id);

  const { data: brandRows } = await supabase.from("brands").select("id, name");
  const brandNameById = new Map<string, string>();
  for (const b of (brandRows ?? []) as Array<{ id: string; name: string }>) brandNameById.set(b.id, b.name);
  const campaignBrandName = new Map<string, string | null>();
  for (const c of campaigns) {
    campaignBrandName.set(c.id, c.brand_id ? brandNameById.get(c.brand_id) ?? null : null);
  }

  // 2. Players, plays, loss prizes, redemptions — only if there are campaigns.
  if (campaignIds.length > 0) {
    const { data: playerRows, error: pErr } = await supabase
      .from("players")
      .select("id, campaign_id, name, email, phone, marketing_consent, marketing_consent_at, created_at")
      .in("campaign_id", campaignIds);
    if (pErr) error = true;
    const players = (playerRows ?? []) as PlayerRow[];

    const { data: playRows } = await supabase
      .from("plays")
      .select("id, campaign_id, player_id, prize_id, status, started_at, completed_at")
      .in("campaign_id", campaignIds);
    const plays = (playRows ?? []) as PlayLite[];

    const { data: prizeRows } = await supabase
      .from("prizes")
      .select("id, is_loss")
      .in("campaign_id", campaignIds);
    const lossPrizeIds = new Set<string>();
    for (const p of (prizeRows ?? []) as Array<{ id: string; is_loss: boolean }>) {
      if (p.is_loss) lossPrizeIds.add(p.id);
    }

    // Redemptions: a play's claimed voucher has been marked redeemed.
    const playIds = plays.map((p) => p.id);
    const redeemedPlayIds = new Set<string>();
    if (playIds.length > 0) {
      const { data: vcs } = await supabase
        .from("voucher_codes")
        .select("claimed_by_play_id, redeemed_at")
        .in("claimed_by_play_id", playIds)
        .not("redeemed_at", "is", null);
      for (const v of (vcs ?? []) as Array<{ claimed_by_play_id: string | null }>) {
        if (v.claimed_by_play_id) redeemedPlayIds.add(v.claimed_by_play_id);
      }
    }

    const playsByPlayer = new Map<string, PlayLite[]>();
    for (const pl of plays) {
      if (!pl.player_id) continue;
      const arr = playsByPlayer.get(pl.player_id) ?? [];
      arr.push(pl);
      playsByPlayer.set(pl.player_id, arr);
    }

    for (const player of players) {
      const key = contactKey(player.email, player.phone, player.id);
      let c = map.get(key);
      if (!c) {
        c = blank(key);
        map.set(key, c);
      }
      if (!c.name && player.name) c.name = player.name;
      if (!c.email && player.email) c.email = player.email;
      if (!c.phone && player.phone) c.phone = player.phone;
      noteConsent(c, player.marketing_consent, player.marketing_consent_at);
      c.firstSeen = minIso(c.firstSeen, player.created_at);
      c.lastSeen = maxIso(c.lastSeen, player.created_at);
      const brandName = campaignBrandName.get(player.campaign_id);
      if (brandName) c.brandSet.add(brandName);

      for (const pl of playsByPlayer.get(player.id) ?? []) {
        if (pl.status !== "completed") continue; // resolved, non-flagged plays
        c.plays += 1;
        if (pl.prize_id && !lossPrizeIds.has(pl.prize_id)) c.wins += 1;
        if (redeemedPlayIds.has(pl.id)) c.redemptions += 1;
        c.firstSeen = minIso(c.firstSeen, pl.started_at);
        c.lastSeen = maxIso(c.lastSeen, pl.completed_at ?? pl.started_at);
      }
    }
  }

  // 3. Merge leads (service-role; agency-global). Matching email/phone folds a
  // lead into the existing customer; otherwise it's a contact-only row.
  const { data: leadRows, error: lErr } = await admin
    .from("leads")
    .select("id, name, email, phone, company, message, marketing_consent, marketing_consent_at, created_at");
  if (lErr) error = true;
  for (const lead of (leadRows ?? []) as LeadRow[]) {
    const key = contactKey(lead.email, lead.phone, lead.id);
    let c = map.get(key);
    if (!c) {
      c = blank(key);
      map.set(key, c);
    }
    c.isLead = true;
    if (!c.name && lead.name) c.name = lead.name;
    if (!c.email && lead.email) c.email = lead.email;
    if (!c.phone && lead.phone) c.phone = lead.phone;
    if (!c.leadCompany && lead.company) c.leadCompany = lead.company;
    if (!c.leadMessage && lead.message) c.leadMessage = lead.message;
    noteConsent(c, lead.marketing_consent, lead.marketing_consent_at);
    c.firstSeen = minIso(c.firstSeen, lead.created_at);
    c.lastSeen = maxIso(c.lastSeen, lead.created_at);
  }

  // 4. Finalize: drop the working Set, sort most-recent first, count segments.
  const customers: CustomerRow[] = Array.from(map.values())
    .map(({ brandSet, ...rest }) => ({ ...rest, brandNames: Array.from(brandSet).sort() }))
    .sort((a, b) => (b.lastSeen ?? "").localeCompare(a.lastSeen ?? ""));

  const lapsedBefore = Date.now() - LAPSED_DAYS * 86_400_000;
  const counts: CustomerSegmentCounts = { all: 0, winners: 0, repeat: 0, lapsed: 0, consented: 0 };
  for (const c of customers) {
    counts.all += 1;
    if (c.wins > 0) counts.winners += 1;
    if (c.plays >= 2) counts.repeat += 1;
    if (c.plays >= 1 && c.lastSeen && new Date(c.lastSeen).getTime() < lapsedBefore) counts.lapsed += 1;
    if (c.marketingConsent) counts.consented += 1;
  }

  return { customers, counts, error };
}

// Filter a customer list to a segment. Kept here so the page and any future
// export share identical segment definitions.
export function inSegment(c: CustomerRow, segment: CustomerSegment): boolean {
  switch (segment) {
    case "winners":
      return c.wins > 0;
    case "repeat":
      return c.plays >= 2;
    case "lapsed":
      return c.plays >= 1 && !!c.lastSeen && new Date(c.lastSeen).getTime() < Date.now() - LAPSED_DAYS * 86_400_000;
    case "consented":
      return c.marketingConsent;
    case "all":
    default:
      return true;
  }
}
