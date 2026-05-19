import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { playerCaptureSchema } from "@/lib/utils/validation";
import { ipHash, rateLimitCheck } from "@/lib/fraud/rateLimit";
import { verifyTurnstileToken } from "@/lib/fraud/turnstile";
import { preflightCheck } from "@/lib/fraud/velocityCheck";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null;
  const ipH = ipHash(ip);
  const rl = rateLimitCheck(`start:${params.slug}:${ipH}`);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs ?? 1000) / 1000)) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = playerCaptureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: campaign, error: cErr } = await supabase
    .from("campaigns")
    .select("id, status, require_capture, max_plays_per_player")
    .eq("slug", params.slug)
    .maybeSingle();

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
  if (!campaign) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (campaign.status !== "active") {
    return NextResponse.json({ error: "campaign_inactive" }, { status: 409 });
  }
  if (campaign.require_capture && !parsed.data.email && !parsed.data.phone) {
    return NextResponse.json({ error: "capture_required" }, { status: 400 });
  }

  // --- security stack ---
  const ts = await verifyTurnstileToken(parsed.data.turnstileToken, ip);
  if (!ts.ok) {
    await supabase.from("fraud_events").insert({
      campaign_id: campaign.id,
      ip_hash: ipH,
      fingerprint: parsed.data.fingerprint ?? null,
      reason: "turnstile_failed",
      details: { codes: ts.errorCodes ?? [] },
    });
    return NextResponse.json(
      { error: "captcha_failed", codes: ts.errorCodes ?? [] },
      { status: 403 },
    );
  }

  const velocity = await preflightCheck({
    campaignId: campaign.id,
    ipHash: ipH,
    fingerprint: parsed.data.fingerprint ?? null,
    email: parsed.data.email ?? null,
  });
  if (!velocity.ok) {
    await supabase.from("fraud_events").insert({
      campaign_id: campaign.id,
      ip_hash: ipH,
      fingerprint: parsed.data.fingerprint ?? null,
      reason: `preflight_velocity_${velocity.reason}`,
      details: { count: velocity.count, window_minutes: velocity.windowMinutes },
    });
    return NextResponse.json(
      { error: "velocity_blocked", reason: velocity.reason },
      { status: 429 },
    );
  }

  // Insert player (best-effort: each capture is a new row; dedupe is Phase 2+)
  let playerId: string | null = null;
  if (parsed.data.name || parsed.data.email || parsed.data.phone) {
    const { data: player, error: pErr } = await supabase
      .from("players")
      .insert({
        campaign_id: campaign.id,
        name: parsed.data.name ?? null,
        email: parsed.data.email ?? null,
        phone: parsed.data.phone ?? null,
        fingerprint: parsed.data.fingerprint ?? null,
        ip_hash: ipH,
      })
      .select("id")
      .single();
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
    playerId = player.id;

    // Enforce max plays per player by email (cheap version)
    if (parsed.data.email && campaign.max_plays_per_player > 0) {
      const { count } = await supabase
        .from("plays")
        .select("id, players!inner(email)", { count: "exact", head: true })
        .eq("campaign_id", campaign.id)
        .eq("players.email", parsed.data.email);
      if ((count ?? 0) >= campaign.max_plays_per_player) {
        return NextResponse.json({ error: "max_plays_reached" }, { status: 429 });
      }
    }
  }

  const { data: play, error: plErr } = await supabase
    .from("plays")
    .insert({
      campaign_id: campaign.id,
      player_id: playerId,
      ip_hash: ipH,
      client_meta: { ua: req.headers.get("user-agent") ?? null },
      status: "started",
    })
    .select("id")
    .single();
  if (plErr) return NextResponse.json({ error: plErr.message }, { status: 500 });

  return NextResponse.json({ playId: play.id, campaignId: campaign.id });
}
