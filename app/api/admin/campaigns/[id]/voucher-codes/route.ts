import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBrand } from "@/lib/admin/brand";
import { voucherCodesSchema } from "@/lib/admin/campaignSchemas";

export const dynamic = "force-dynamic";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// POST /api/admin/campaigns/[id]/voucher-codes — bulk add codes to a prize.
// RLS on voucher_codes enforces that prize -> campaign -> brand is owned by caller.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const brand = await getCurrentBrand();
  if (!brand) return err("unauthorized", "Sign in to upload voucher codes.", 401);

  const body = await req.json().catch(() => ({}));
  const parsed = voucherCodesSchema.safeParse(body);
  if (!parsed.success) {
    return err("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }

  const supabase = createClient();

  // Confirm the prize belongs to this campaign (and, via RLS, to this brand).
  const { data: prize } = await supabase
    .from("prizes")
    .select("id")
    .eq("id", parsed.data.prize_id)
    .eq("campaign_id", params.id)
    .maybeSingle();
  if (!prize) return err("prize_not_found", "Prize not found in this campaign.", 404);

  // Dedupe within the payload, then insert ignoring existing (prize_id, code).
  const unique = Array.from(new Set(parsed.data.codes.map((c) => c.trim()).filter(Boolean)));
  const rows = unique.map((code) => ({ prize_id: parsed.data.prize_id, code }));

  const { error } = await supabase
    .from("voucher_codes")
    .upsert(rows, { onConflict: "prize_id,code", ignoreDuplicates: true });
  if (error) return err("insert_failed", error.message, 500);

  return NextResponse.json({ ok: true, submitted: rows.length });
}
