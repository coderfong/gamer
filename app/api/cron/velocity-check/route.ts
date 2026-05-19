import { NextRequest, NextResponse } from "next/server";
import { sweep } from "@/lib/fraud/velocityCheck";

export const dynamic = "force-dynamic";

// Protect this with a shared secret OR Vercel cron auth header.
// In dev (CRON_SECRET unset) it's open so you can curl it.
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const report = await sweep();
    return NextResponse.json({ ok: true, ...report });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "sweep_failed" },
      { status: 500 },
    );
  }
}
