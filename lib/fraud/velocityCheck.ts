import { createAdminClient } from "@/lib/supabase/admin";

// Velocity = rate of plays from a single signal (IP, fingerprint, email).
// Two modes:
//
//   preflightCheck()  — called before allowing a new play. Returns a hard block
//                       if recent counts cross strict thresholds.
//   sweep()           — called by the cron route. Scans last N minutes,
//                       flags plays + writes fraud_events when soft thresholds cross.
//
// Thresholds are intentionally conservative; tune in campaign config in Phase 3+.

export interface VelocityVerdict {
  ok: boolean;
  reason?: "ip" | "fingerprint" | "email";
  count?: number;
  windowMinutes?: number;
}

const PREFLIGHT_WINDOW_MIN = 5;
const PREFLIGHT_IP_LIMIT = 8;
const PREFLIGHT_FP_LIMIT = 5;
const PREFLIGHT_EMAIL_LIMIT = 3;

const SWEEP_WINDOW_MIN = 60;
const SWEEP_IP_LIMIT = 30;
const SWEEP_FP_LIMIT = 20;
const SWEEP_EMAIL_LIMIT = 10;

function isoMinutesAgo(min: number): string {
  return new Date(Date.now() - min * 60_000).toISOString();
}

export async function preflightCheck(args: {
  campaignId: string;
  ipHash: string | null;
  fingerprint: string | null;
  email: string | null;
}): Promise<VelocityVerdict> {
  const supabase = createAdminClient();
  const since = isoMinutesAgo(PREFLIGHT_WINDOW_MIN);

  if (args.ipHash) {
    const { count } = await supabase
      .from("plays")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", args.campaignId)
      .eq("ip_hash", args.ipHash)
      .gte("started_at", since);
    if ((count ?? 0) >= PREFLIGHT_IP_LIMIT) {
      return { ok: false, reason: "ip", count: count ?? 0, windowMinutes: PREFLIGHT_WINDOW_MIN };
    }
  }

  if (args.fingerprint) {
    const { count } = await supabase
      .from("plays")
      .select("id, players!inner(fingerprint)", { count: "exact", head: true })
      .eq("campaign_id", args.campaignId)
      .eq("players.fingerprint", args.fingerprint)
      .gte("started_at", since);
    if ((count ?? 0) >= PREFLIGHT_FP_LIMIT) {
      return { ok: false, reason: "fingerprint", count: count ?? 0, windowMinutes: PREFLIGHT_WINDOW_MIN };
    }
  }

  if (args.email) {
    const { count } = await supabase
      .from("plays")
      .select("id, players!inner(email)", { count: "exact", head: true })
      .eq("campaign_id", args.campaignId)
      .eq("players.email", args.email)
      .gte("started_at", since);
    if ((count ?? 0) >= PREFLIGHT_EMAIL_LIMIT) {
      return { ok: false, reason: "email", count: count ?? 0, windowMinutes: PREFLIGHT_WINDOW_MIN };
    }
  }

  return { ok: true };
}

interface SweepReport {
  scannedMs: number;
  flaggedPlays: number;
  fraudEvents: number;
}

/**
 * Sweep recent plays and flag suspicious clusters. Writes to fraud_events and
 * marks the offending plays status='flagged' (NOT 'voided' — humans decide).
 */
export async function sweep(): Promise<SweepReport> {
  const supabase = createAdminClient();
  const start = Date.now();
  const since = isoMinutesAgo(SWEEP_WINDOW_MIN);

  let flaggedPlays = 0;
  let fraudEvents = 0;

  // 1. IP clusters
  const ipResp = await supabase
    .from("plays")
    .select("campaign_id, ip_hash, id")
    .gte("started_at", since)
    .neq("status", "voided")
    .not("ip_hash", "is", null);
  const ipRows = (ipResp.data ?? []) as Array<{ campaign_id: string; ip_hash: string | null; id: string }>;

  const ipCounts = new Map<string, { campaignId: string; ipHash: string; ids: string[] }>();
  for (const r of ipRows) {
    if (!r.ip_hash) continue;
    const key = `${r.campaign_id}:${r.ip_hash}`;
    const bucket = ipCounts.get(key) ?? { campaignId: r.campaign_id, ipHash: r.ip_hash, ids: [] };
    bucket.ids.push(r.id);
    ipCounts.set(key, bucket);
  }
  for (const { campaignId, ipHash, ids } of ipCounts.values()) {
    if (ids.length < SWEEP_IP_LIMIT) continue;
    await (supabase.from("plays") as any).update({ status: "flagged" }).in("id", ids);
    flaggedPlays += ids.length;
    await supabase.from("fraud_events").insert({
      campaign_id: campaignId,
      ip_hash: ipHash,
      reason: "velocity_ip",
      details: { count: ids.length, window_minutes: SWEEP_WINDOW_MIN },
    });
    fraudEvents += 1;
  }

  // 2. Fingerprint clusters (joined via player)
  const fpResp = await supabase
    .from("plays")
    .select("id, campaign_id, players!inner(fingerprint)")
    .gte("started_at", since)
    .neq("status", "voided");
  const fpRows = (fpResp.data ?? []) as Array<{
    id: string;
    campaign_id: string;
    players: { fingerprint: string | null } | { fingerprint: string | null }[] | null;
  }>;

  const fpCounts = new Map<string, { campaignId: string; fingerprint: string; ids: string[] }>();
  for (const r of fpRows) {
    const p = Array.isArray(r.players) ? r.players[0] : r.players;
    const fp = p?.fingerprint ?? null;
    if (!fp) continue;
    const key = `${r.campaign_id}:${fp}`;
    const bucket = fpCounts.get(key) ?? { campaignId: r.campaign_id, fingerprint: fp, ids: [] };
    bucket.ids.push(r.id);
    fpCounts.set(key, bucket);
  }
  for (const { campaignId, fingerprint, ids } of fpCounts.values()) {
    if (ids.length < SWEEP_FP_LIMIT) continue;
    await (supabase.from("plays") as any).update({ status: "flagged" }).in("id", ids);
    flaggedPlays += ids.length;
    await supabase.from("fraud_events").insert({
      campaign_id: campaignId,
      fingerprint,
      reason: "velocity_fingerprint",
      details: { count: ids.length, window_minutes: SWEEP_WINDOW_MIN },
    });
    fraudEvents += 1;
  }

  // 3. Email clusters
  const emailResp = await supabase
    .from("plays")
    .select("id, campaign_id, players!inner(email)")
    .gte("started_at", since)
    .neq("status", "voided");
  const emailRows = (emailResp.data ?? []) as Array<{
    id: string;
    campaign_id: string;
    players: { email: string | null } | { email: string | null }[] | null;
  }>;

  const emailCounts = new Map<string, { campaignId: string; email: string; ids: string[] }>();
  for (const r of emailRows) {
    const p = Array.isArray(r.players) ? r.players[0] : r.players;
    const email = p?.email ?? null;
    if (!email) continue;
    const key = `${r.campaign_id}:${email.toLowerCase()}`;
    const bucket = emailCounts.get(key) ?? { campaignId: r.campaign_id, email, ids: [] };
    bucket.ids.push(r.id);
    emailCounts.set(key, bucket);
  }
  for (const { campaignId, email, ids } of emailCounts.values()) {
    if (ids.length < SWEEP_EMAIL_LIMIT) continue;
    await (supabase.from("plays") as any).update({ status: "flagged" }).in("id", ids);
    flaggedPlays += ids.length;
    await supabase.from("fraud_events").insert({
      campaign_id: campaignId,
      reason: "velocity_email",
      details: { email, count: ids.length, window_minutes: SWEEP_WINDOW_MIN },
    });
    fraudEvents += 1;
  }

  return { scannedMs: Date.now() - start, flaggedPlays, fraudEvents };
}
