import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Public email capture from a brand's play hub (/b/<slug>). Stores the contact
// against the brand so it shows on that brand's signups dashboard. Service-role
// insert (the visitor isn't authenticated); the brand is resolved by its public
// slug so a caller can only ever write to a real, published hub.
//
// On a WIN we also mint a unique voucher code on the same row, so the prize can
// be scanned + redeemed on the client portal's Redeem tab.

const schema = z.object({
  email: z.string().trim().email().max(200),
  name: z.string().trim().max(120).optional(),
  gameType: z.string().trim().max(64).optional(),
  won: z.boolean().optional(),
  prizeLabel: z.string().trim().max(120).optional(),
  marketingConsent: z.boolean().optional(),
  // Honeypot — bots fill hidden fields, humans never see it.
  website: z.string().max(200).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  // Honeypot tripped → pretend success, store nothing.
  if (parsed.data.website) return NextResponse.json({ ok: true });

  const supabase = createAdminClient();
  const { data: brand } = await supabase
    .from("brands")
    .select("id")
    .eq("public_slug", params.slug)
    .maybeSingle();
  if (!brand) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const won = parsed.data.won === true;
  const voucherCode = won ? "HUB-" + randomBytes(5).toString("hex").toUpperCase() : null;

  const { error } = await supabase.from("brand_signups").insert({
    brand_id: (brand as { id: string }).id,
    email: parsed.data.email,
    name: parsed.data.name || null,
    game_type: parsed.data.gameType || null,
    won: typeof parsed.data.won === "boolean" ? parsed.data.won : null,
    prize_label: parsed.data.prizeLabel || null,
    voucher_code: voucherCode,
    marketing_consent: parsed.data.marketingConsent === true,
    source: "play_hub",
  });
  if (error) return NextResponse.json({ error: "store_failed" }, { status: 500 });

  return NextResponse.json({ ok: true, voucherCode });
}
