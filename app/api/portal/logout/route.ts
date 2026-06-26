import { NextRequest, NextResponse } from "next/server";
import { PORTAL_COOKIE } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/portal/login", req.url));
  res.cookies.set(PORTAL_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
