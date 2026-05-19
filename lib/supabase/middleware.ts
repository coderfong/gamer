import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

// Supabase SSR helper for use inside Next.js middleware. Refreshes the auth
// session cookie on every matched request and returns the response with
// updated cookies attached.
export function createMiddlewareClient(req: NextRequest) {
  const res = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({ name, value, ...options });
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({ name, value: "", ...options });
          res.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  return { supabase, res };
}
