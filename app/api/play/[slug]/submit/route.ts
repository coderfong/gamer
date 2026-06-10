import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { submitPlaySchema } from "@/lib/utils/validation";
import { drawPrize } from "@/lib/prizes/drawPrize";
import { lookupAndClaim } from "@/lib/prizes/skillScoreLookup";
import { previewDraw } from "@/lib/prizes/previewDraw";
import { ownsCampaignBySlug } from "@/lib/admin/previewGuard";
import { ipHash } from "@/lib/fraud/rateLimit";
import { preflightCheck } from "@/lib/fraud/velocityCheck";

export const dynamic = "force-dynamic";

// Game types that are skill-based (score → tier via campaign.config.win_thresholds).
// Chance games use the weighted random draw.
const SKILL_GAMES = new Set(["quiz"]);

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null;
  const ipH = ipHash(ip);

  const body = await req.json().catch(() => ({}));
  const parsed = submitPlaySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createAdminClient();

  // --- preview mode ---
  // Owner dry-run: compute a realistic outcome without touching plays/players/
  // voucher inventory. The synthetic playId from /start isn't a real row.
  const isPreview = req.nextUrl.searchParams.get("preview") === "1";
  if (isPreview) {
    if (!(await ownsCampaignBySlug(params.slug))) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const { data: previewCampaign } = await supabase
      .from("campaigns")
      .select("id, game_type, config")
      .eq("slug", params.slug)
      .maybeSingle();
    if (!previewCampaign) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const result = await previewDraw({
      campaignId: previewCampaign.id,
      gameType: previewCampaign.game_type,
      score: parsed.data.score,
      config: (previewCampaign.config ?? {}) as Record<string, unknown>,
    });
    let previewPrize = null;
    if (result.prize_id) {
      const { data: p } = await supabase
        .from("prizes")
        .select("id, name, description, image_url, is_loss")
        .eq("id", result.prize_id)
        .maybeSingle();
      previewPrize = p ?? null;
    }
    return NextResponse.json({
      playId: parsed.data.playId,
      prize: previewPrize,
      voucherCode: result.code,
      flagged: false,
      preview: true,
    });
  }

  const { data: play, error } = await supabase
    .from("plays")
    .select("id, campaign_id, status, player_id, campaigns!inner(slug, status, game_type)")
    .eq("id", parsed.data.playId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!play) return NextResponse.json({ error: "play_not_found" }, { status: 404 });
  const campaign = (Array.isArray((play as any).campaigns)
    ? (play as any).campaigns[0]
    : (play as any).campaigns) as { slug: string; status: string; game_type: string };
  if (campaign.slug !== params.slug) {
    return NextResponse.json({ error: "slug_mismatch" }, { status: 400 });
  }
  if (play.status !== "started") {
    return NextResponse.json({ error: "play_already_resolved" }, { status: 409 });
  }

  // Persist score/outcome before drawing.
  await supabase
    .from("plays")
    .update({
      score: parsed.data.score ?? null,
      client_meta: {
        outcome: parsed.data.outcome ?? null,
        durationMs: parsed.data.durationMs ?? null,
      },
    })
    .eq("id", play.id);

  // Soft velocity check at submit time. If it trips, we still resolve a
  // prize (so a bot can't tell), but draw with flagged=true so no voucher
  // is claimed and no inventory is decremented.
  // Fetch player email/fingerprint for the check.
  let playerEmail: string | null = null;
  let playerFingerprint: string | null = null;
  if (play.player_id) {
    const { data: p } = await supabase
      .from("players")
      .select("email, fingerprint")
      .eq("id", play.player_id)
      .maybeSingle();
    playerEmail = (p as { email?: string | null } | null)?.email ?? null;
    playerFingerprint = (p as { fingerprint?: string | null } | null)?.fingerprint ?? null;
  }
  const verdict = await preflightCheck({
    campaignId: play.campaign_id,
    ipHash: ipH,
    fingerprint: playerFingerprint,
    email: playerEmail,
  });
  const flagged = !verdict.ok;
  if (flagged) {
    await supabase.from("fraud_events").insert({
      campaign_id: play.campaign_id,
      play_id: play.id,
      ip_hash: ipH,
      fingerprint: playerFingerprint,
      reason: `submit_velocity_${verdict.reason}`,
      details: { count: verdict.count, window_minutes: verdict.windowMinutes },
    });
  }

  const isSkill = SKILL_GAMES.has(campaign.game_type);
  let result;
  try {
    result =
      isSkill && typeof parsed.data.score === "number"
        ? await lookupAndClaim({
            campaignId: play.campaign_id,
            playId: play.id,
            score: parsed.data.score,
            flagged,
          })
        : await drawPrize({
            campaignId: play.campaign_id,
            playId: play.id,
            score: parsed.data.score,
            flagged,
          });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "draw_failed", message }, { status: 500 });
  }

  let prize:
    | null
    | { id: string; name: string; description: string | null; image_url: string | null; is_loss: boolean } = null;
  if (result.prize_id) {
    const { data: p } = await supabase
      .from("prizes")
      .select("id, name, description, image_url, is_loss")
      .eq("id", result.prize_id)
      .maybeSingle();
    prize = (p as typeof prize) ?? null;
  }

  return NextResponse.json({
    playId: play.id,
    prize,
    voucherCode: flagged ? null : result.code,
    flagged,
  });
}
