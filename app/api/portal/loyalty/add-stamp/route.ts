import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { PORTAL_COOKIE, verifyBrandSession } from "@/lib/portal/session";
import { addStamp, findMemberByPhone, loadMemberState, programConfig } from "@/lib/loyalty/loyalty";

export const dynamic = "force-dynamic";

// Staff: add one stamp to a member's card. Auth is the brand-scoped portal cookie,
// so a staff session can only ever stamp its own brand's members.
const schema = z.object({ phone: z.string().trim().min(6).max(40) });

export async function POST(req: NextRequest) {
  const brandId = verifyBrandSession(cookies().get(PORTAL_COOKIE)?.value ?? null);
  if (!brandId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const admin = createAdminClient();
  const member = await findMemberByPhone(admin, brandId, parsed.data.phone);
  if (!member) return NextResponse.json({ error: "not_a_member" }, { status: 404 });

  const { data: brand } = await admin.from("brands").select("studio").eq("id", brandId).maybeSingle();
  const program = programConfig((brand as { studio: unknown } | null)?.studio);

  try {
    const result = await addStamp(admin, brandId, member.id, program);
    const state = await loadMemberState(admin, brandId, member);
    return NextResponse.json({ ok: true, result, ...state });
  } catch {
    return NextResponse.json({ error: "add_stamp_failed" }, { status: 500 });
  }
}
