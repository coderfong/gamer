import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { PORTAL_COOKIE, verifyBrandSession } from "@/lib/portal/session";
import { lookupBrandVoucher } from "@/lib/portal/redeemLookup";

export const dynamic = "force-dynamic";

const schema = z.object({ code: z.string().trim().min(1).max(200) });

// Look up a scanned voucher within the signed-in client's brand.
export async function POST(req: NextRequest) {
  const brandId = verifyBrandSession(req.cookies.get(PORTAL_COOKIE)?.value);
  if (!brandId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const voucher = await lookupBrandVoucher(createAdminClient(), brandId, parsed.data.code);
  if (!voucher) return NextResponse.json({ found: false });
  return NextResponse.json({ found: true, voucher });
}
