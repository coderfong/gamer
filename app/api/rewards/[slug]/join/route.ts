import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { findBrandBySlug, joinMember, loadMemberState, programConfig } from "@/lib/loyalty/loyalty";

export const dynamic = "force-dynamic";

// Public: a customer joins a brand's rewards program by phone (no password).
// Service-role insert; the brand is resolved by its public slug so a caller can
// only ever write to a real, published rewards page.
const schema = z.object({
  name: z.string().trim().max(120).optional(),
  phone: z.string().trim().min(6).max(40),
  marketingConsent: z.boolean().optional(),
  website: z.string().max(200).optional(), // honeypot
});

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  if (parsed.data.website) return NextResponse.json({ ok: true }); // honeypot

  const admin = createAdminClient();
  const brand = await findBrandBySlug(admin, params.slug);
  if (!brand) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { goal } = programConfig(brand.studio);
  try {
    const member = await joinMember(admin, brand.id, {
      name: parsed.data.name,
      phone: parsed.data.phone,
      marketingConsent: parsed.data.marketingConsent,
      goal,
    });
    const state = await loadMemberState(admin, brand.id, member);
    return NextResponse.json({ ok: true, ...state });
  } catch {
    return NextResponse.json({ error: "join_failed" }, { status: 500 });
  }
}
