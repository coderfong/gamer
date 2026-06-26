import { createHmac, timingSafeEqual } from "crypto";

// Client-portal session: a signed, httpOnly cookie that scopes a logged-in client
// to exactly one brand. No Supabase auth account — the client proves they hold the
// brand's access key at /api/portal/login, and we hand back this signed token.
//
// Token format: <brandId>.<hmac(brandId)>, base64url-safe. Verification recomputes
// the HMAC, so a client can't tamper with the brand id.

const SECRET = process.env.CLIENT_PORTAL_SECRET || process.env.ADMIN_LOGIN_KEY || "gameable-portal-dev-secret";

export const PORTAL_COOKIE = "bp";

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("base64url");
}

export function signBrandSession(brandId: string): string {
  return `${brandId}.${sign(brandId)}`;
}

export function verifyBrandSession(token: string | null | undefined): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const brandId = token.slice(0, dot);
  const provided = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(sign(brandId));
  if (provided.length !== expected.length) return null;
  return timingSafeEqual(provided, expected) ? brandId : null;
}

// Constant-time compare for the brand access key.
export function keysMatch(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
