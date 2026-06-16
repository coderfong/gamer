import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

// Protected route prefixes. Anything matched here requires an authenticated user.
const PROTECTED_PREFIXES = ["/dashboard", "/campaigns", "/billing", "/leads"];

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

  // --- Hidden admin auth gate (opt-in via ADMIN_LOGIN_KEY) ---------------------
  // When the key is set: public signup is disabled and /login is invisible (404)
  // to the public. The operator unlocks /login once per browser by visiting
  // /login?key=<ADMIN_LOGIN_KEY>, which sets an httpOnly gate cookie; from then on
  // the login form renders for that browser. With the key unset (dev) auth pages
  // behave normally.
  const adminKey = process.env.ADMIN_LOGIN_KEY;
  if (adminKey && !user && (path === "/login" || path === "/signup")) {
    if (path === "/signup") {
      return NextResponse.rewrite(new URL("/__hidden", req.url));
    }
    const provided = req.nextUrl.searchParams.get("key");
    const gate = req.cookies.get("ag")?.value;
    if (provided && provided === adminKey) {
      const clean = req.nextUrl.clone();
      clean.searchParams.delete("key");
      const unlocked = NextResponse.redirect(clean);
      unlocked.cookies.set("ag", adminKey, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
      return unlocked;
    }
    if (gate !== adminKey) {
      return NextResponse.rewrite(new URL("/__hidden", req.url));
    }
    // gate cookie valid → fall through and let the login form render
  }

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
