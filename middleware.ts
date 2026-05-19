import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

// Protected route prefixes. Anything matched here requires an authenticated user.
const PROTECTED_PREFIXES = ["/dashboard", "/campaigns", "/billing"];

// Public route prefixes. These bypass auth entirely.
const PUBLIC_PREFIXES = [
  "/play",
  "/api/play",
  "/api/cron",
  "/login",
  "/signup",
  "/reset-password",
  "/auth",
];

export async function middleware(req: NextRequest) {
  const { supabase, res } = createMiddlewareClient(req);

  // ALWAYS refresh the session, regardless of route — Supabase requires this
  // for cookie-based auth to keep working.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;

  const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
  const isPublic = PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));

  if (isProtected && !user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // If a logged-in user hits /login or /signup, send them to /dashboard.
  if (user && (path === "/login" || path === "/signup")) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // isPublic is informational — kept so the intent is documented even though
  // unmatched routes (e.g. /, /api/auth/*) also fall through.
  void isPublic;

  return res;
}

export const config = {
  matcher: [
    // Run on everything except static files and Next internals.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js)$).*)",
  ],
};
