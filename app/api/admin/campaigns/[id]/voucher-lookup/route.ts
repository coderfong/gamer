import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBrand } from "@/lib/admin/brand";

export const dynamic = "force-dynamic";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// GET /api/admin/campaigns/[id]/voucher-lookup?code=XXXX
// Finds a claimed voucher in this campaign and returns the play + (unmasked,
// brand-owned) player contact so staff can verify and redeem.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const brand = await getCurrentBrand();
  if (!brand) return err("unauthorized", "Sign in.", 401);

  const code = req.nextUrl.searchParams.get("code")?.trim();
  if (!code) return err("no_code", "Enter a voucher code.", 400);

  const supabase = createClient();
  const { data: voucher, error } = await supabase
    .from("voucher_codes")
    .select(
      "id, code, claimed_at, claimed_by_play_id, redeemed_at, prizes!inner(name, campaign_id)",
    )
    .eq("code", code)
    .eq("prizes.campaign_id", params.id)
    .maybeSingle();
  if (error) return err("read_failed", error.message, 500);
  if (!voucher) return NextResponse.json({ found: false });

  const prize = (Array.isArray(voucher.prizes) ? voucher.prizes[0] : voucher.prizes) as {
    name: string;
  } | null;

  let play: { id: string; wonAt: string | null; contact: string | null } | null = null;
  if (voucher.claimed_by_play_id) {
    const { data: playRow } = await supabase
      .from("plays")
      .select("id, completed_at, players(email, phone)")
      .eq("id", voucher.claimed_by_play_id)
      .maybeSingle();
    if (playRow) {
      const player = (Array.isArray(playRow.players) ? playRow.players[0] : playRow.players) as
        | { email: string | null; phone: string | null }
        | null;
      play = {
        id: playRow.id,
        wonAt: playRow.completed_at,
        contact: player?.email || player?.phone || null,
      };
    }
  }

  return NextResponse.json({
    found: true,
    voucher: {
      code: voucher.code,
      prizeName: prize?.name ?? null,
      claimed: Boolean(voucher.claimed_at),
      redeemed: Boolean(voucher.redeemed_at),
    },
    play,
  });
}
