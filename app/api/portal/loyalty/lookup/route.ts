import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { PORTAL_COOKIE, verifyBrandSession } from "@/lib/portal/session";
import { findMemberByPhone, loadMemberState } from "@/lib/loyalty/loyalty";

export const dynamic = "force-dynamic";

// Staff: look up a member's card by phone (read-only, no stamp added).
export async function GET(req: NextRequest) {
  const brandId = verifyBrandSession(cookies().get(PORTAL_COOKIE)?.value ?? null);
  if (!brandId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const phone = req.nextUrl.searchParams.get("phone")?.trim();
  if (!phone) return NextResponse.json({ error: "missing_phone" }, { status: 400 });

  const admin = createAdminClient();
  const member = await findMemberByPhone(admin, brandId, phone);
  if (!member) return NextResponse.json({ error: "not_a_member" }, { status: 404 });

  const state = await loadMemberState(admin, brandId, member);
  return NextResponse.json({ ok: true, ...state });
}
