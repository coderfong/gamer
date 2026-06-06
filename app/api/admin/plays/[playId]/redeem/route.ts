import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// POST /api/admin/plays/[playId]/redeem
// Marks the play's voucher as redeemed (voucher_codes.redeemed_at) and records a
// redemptions row stamped with the logged-in staff email. RLS scopes everything
// to the caller's brand via the play -> campaign chain.
export async function POST(_req: Request, { params }: { params: { playId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("unauthorized", "Sign in to redeem.", 401);

  const { data: play } = await supabase
    .from("plays")
    .select("id, voucher_code_id")
    .eq("id", params.playId)
    .maybeSingle();
  if (!play) return err("not_found", "Play not found.", 404);
  if (!play.voucher_code_id) {
    return err("no_voucher", "This play has no voucher to redeem.", 422);
  }

  const { data: voucher } = await supabase
    .from("voucher_codes")
    .select("id, redeemed_at")
    .eq("id", play.voucher_code_id)
    .maybeSingle();
  if (!voucher) return err("voucher_not_found", "Voucher not found.", 404);
  if (voucher.redeemed_at) {
    return err("already_redeemed", "This voucher has already been redeemed.", 409);
  }

  const now = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("voucher_codes")
    .update({ redeemed_at: now })
    .eq("id", voucher.id);
  if (updErr) return err("update_failed", updErr.message, 500);

  const { error: insErr } = await supabase.from("redemptions").insert({
    voucher_code_id: voucher.id,
    redeemed_by: user.email ?? user.id,
  });
  if (insErr) return err("record_failed", insErr.message, 500);

  return NextResponse.json({ ok: true, redeemedAt: now });
}
