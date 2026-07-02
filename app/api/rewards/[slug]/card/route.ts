import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findBrandBySlug, findMemberByPhone, loadMemberState } from "@/lib/loyalty/loyalty";

export const dynamic = "force-dynamic";

// Public: fetch a member's current card + active voucher by phone. Read-only —
// customers can never add their own stamps.
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const phone = req.nextUrl.searchParams.get("phone")?.trim();
  if (!phone) return NextResponse.json({ error: "missing_phone" }, { status: 400 });

  const admin = createAdminClient();
  const brand = await findBrandBySlug(admin, params.slug);
  if (!brand) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const member = await findMemberByPhone(admin, brand.id, phone);
  if (!member) return NextResponse.json({ error: "not_a_member" }, { status: 404 });

  const state = await loadMemberState(admin, brand.id, member);
  return NextResponse.json({ ok: true, ...state });
}
