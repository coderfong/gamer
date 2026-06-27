import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { PORTAL_COOKIE, verifyBrandSession } from "@/lib/portal/session";
import { lookupBrandVoucher } from "@/lib/portal/redeemLookup";

export const dynamic = "force-dynamic";

const schema = z.object({ code: z.string().trim().min(1).max(200) });

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// Redeem a SCANNED voucher — the only way to redeem from the client portal. The
// voucher must belong to the signed-in brand, be claimed (an actual win), and
// not already redeemed.
export async function POST(req: NextRequest) {
  const brandId = verifyBrandSession(req.cookies.get(PORTAL_COOKIE)?.value);
  if (!brandId) return err("unauthorized", "Sign in.", 401);

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err("invalid_input", "Scan a voucher QR.", 400);

  const admin = createAdminClient();
  const voucher = await lookupBrandVoucher(admin, brandId, parsed.data.code);
  if (!voucher) return err("not_found", "That voucher isn't from your games.", 404);
  if (!voucher.claimed) return err("not_a_win", "This code isn't a winning voucher.", 422);
  if (voucher.redeemed) return err("already_redeemed", "This voucher was already redeemed.", 409);

  const now = new Date().toISOString();

  if (voucher.source === "hub") {
    // Play-hub voucher lives on the brand_signups row.
    const { error: updErr } = await admin.from("brand_signups").update({ redeemed_at: now }).eq("id", voucher.id);
    if (updErr) return err("update_failed", updErr.message, 500);
  } else {
    const { error: updErr } = await admin.from("voucher_codes").update({ redeemed_at: now }).eq("id", voucher.id);
    if (updErr) return err("update_failed", updErr.message, 500);
    // Best-effort audit row; don't fail the redemption if it can't be written.
    await admin.from("redemptions").insert({ voucher_code_id: voucher.id, redeemed_by: "client_portal" });
  }

  return NextResponse.json({ ok: true, redeemedAt: now, prizeName: voucher.prizeName });
}
