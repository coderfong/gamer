import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { PORTAL_COOKIE, signBrandSession, keysMatch } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

// Resolve a brand by slug and check the supplied access key. Returns the brand id
// on success, else null. Only brands that have a key set can be signed into.
async function authenticate(slug: string | null, key: string | null): Promise<string | null> {
  if (!slug || !key) return null;
  const supabase = createAdminClient();
  const { data: brand } = await supabase
    .from("brands")
    .select("id, client_access_key")
    .eq("public_slug", slug)
    .maybeSingle();
  const stored = (brand as { id: string; client_access_key: string | null } | null)?.client_access_key;
  if (!brand || !stored || !keysMatch(key, stored)) return null;
  return (brand as { id: string }).id;
}

// One-click magic link: /api/portal/login?b=<slug>&k=<key> → set cookie → /portal.
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("b");
  const key = req.nextUrl.searchParams.get("k");
  const brandId = await authenticate(slug, key);
  if (!brandId) {
    return NextResponse.redirect(new URL(`/portal/login?b=${encodeURIComponent(slug ?? "")}&e=1`, req.url));
  }
  const res = NextResponse.redirect(new URL("/portal", req.url));
  res.cookies.set(PORTAL_COOKIE, signBrandSession(brandId), COOKIE_OPTS);
  return res;
}

const bodySchema = z.object({
  slug: z.string().trim().min(1).max(120),
  key: z.string().trim().min(1).max(200),
});

// Form login.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const brandId = await authenticate(parsed.data.slug, parsed.data.key);
  if (!brandId) return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(PORTAL_COOKIE, signBrandSession(brandId), COOKIE_OPTS);
  return res;
}
