import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { submitPlaySchema } from "@/lib/utils/validation";
import { drawPrize } from "@/lib/prizes/drawPrize";
import { ipHash, rateLimitCheck } from "@/lib/fraud/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null;
  const ipH = ipHash(ip);
  const rl = rateLimitCheck(`submit:${params.slug}:${ipH}`);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const parsed = submitPlaySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: play, error } = await supabase
    .from("plays")
    .select("id, campaign_id, status, campaigns!inner(slug, status)")
    .eq("id", parsed.data.playId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!play) return NextResponse.json({ error: "play_not_found" }, { status: 404 });
  // @ts-expect-error nested select
  if (play.campaigns.slug !== params.slug) {
    return NextResponse.json({ error: "slug_mismatch" }, { status: 400 });
  }
  if (play.status !== "started") {
    return NextResponse.json({ error: "play_already_resolved" }, { status: 409 });
  }

  // Persist score/outcome before drawing (used by skill-game prize logic).
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

  const result = await drawPrize({
    campaignId: play.campaign_id,
    playId: play.id,
    score: parsed.data.score,
  });

  // Fetch prize details for the response.
  let prize = null as
    | null
    | { id: string; name: string; description: string | null; image_url: string | null; is_loss: boolean };
  if (result.prize_id) {
    const { data: p } = await supabase
      .from("prizes")
      .select("id, name, description, image_url, is_loss")
      .eq("id", result.prize_id)
      .maybeSingle();
    prize = p ?? null;
  }

  return NextResponse.json({
    playId: play.id,
    prize,
    voucherCode: result.code,
  });
}
