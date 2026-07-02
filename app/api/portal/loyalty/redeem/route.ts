import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { PORTAL_COOKIE, verifyBrandSession } from "@/lib/portal/session";
import { redeemVoucher } from "@/lib/loyalty/loyalty";

export const dynamic = "force-dynamic";

// Staff: redeem a loyalty voucher by code. Brand-scoped by the portal cookie.
const schema = z.object({ code: z.string().trim().min(3).max(64) });

export async function POST(req: NextRequest) {
  const brandId = verifyBrandSession(cookies().get(PORTAL_COOKIE)?.value ?? null);
  if (!brandId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const admin = createAdminClient();
  try {
    const result = await redeemVoucher(admin, brandId, parsed.data.code, "portal");
    return NextResponse.json({ ok: result.ok, already: result.already, rewardLabel: result.rewardLabel });
  } catch {
    return NextResponse.json({ error: "redeem_failed" }, { status: 500 });
  }
}
