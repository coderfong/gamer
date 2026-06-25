import { createHmac, timingSafeEqual } from "crypto";

// One-click marketing unsubscribe links for broadcast emails (PDPA).
//
// The link carries the contact's email plus an HMAC of that email, so the
// /api/unsubscribe route can flip marketing_consent to false without a login and
// without anyone being able to opt someone else out by guessing a URL.
//
// Falls back to a constant secret when MARKETING_UNSUB_SECRET is unset so links
// still work in dev (set a real secret in production). Email is lower-cased
// before signing so casing differences don't break the token.

const SECRET = process.env.MARKETING_UNSUB_SECRET || "gameable-unsub-dev-secret";
const TOKEN_LEN = 32;

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

export function signEmail(email: string): string {
  return createHmac("sha256", SECRET).update(normalize(email)).digest("base64url").slice(0, TOKEN_LEN);
}

export function verifyEmailToken(email: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const expected = Buffer.from(signEmail(email));
  const provided = Buffer.from(token);
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

export function unsubscribeUrl(appUrl: string, email: string): string {
  const params = new URLSearchParams({ e: normalize(email), t: signEmail(email) });
  return `${appUrl}/api/unsubscribe?${params.toString()}`;
}
