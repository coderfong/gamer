import { createHmac, timingSafeEqual } from "crypto";

// QR-only access gating for the real prize games at /play/<slug>.
//
// The QR encodes /play/<slug>?k=<token>, where the token is an HMAC of the slug
// signed with PLAY_QR_SECRET. The play page and the start/submit APIs reject any
// request without a valid token, so the playable game is reachable only through
// the displayed QR/link — not by guessing the slug or via search indexing.
//
// Gating is OPT-IN: it only activates when PLAY_QR_SECRET is set. With the secret
// unset (e.g. local dev), every check returns "allow" and the URLs stay plain, so
// existing behaviour is unchanged until you turn it on in production.
//
// Note: a QR printed on public media is inherently a shareable URL — this stops
// discovery/guessing/indexing, not a person forwarding the full scanned link.

const SECRET = process.env.PLAY_QR_SECRET ?? "";
const TOKEN_LEN = 24; // truncated base64url chars (~144 bits) — short for QR density

export function qrGatingEnabled(): boolean {
  return SECRET.length > 0;
}

export function signSlug(slug: string): string {
  return createHmac("sha256", SECRET).update(slug).digest("base64url").slice(0, TOKEN_LEN);
}

export function verifySlug(slug: string, token: string | null | undefined): boolean {
  if (!qrGatingEnabled()) return true; // gate disabled → allow everything
  if (!token) return false;
  const expected = Buffer.from(signSlug(slug));
  const provided = Buffer.from(token);
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

// The canonical play URL for QR codes and share links. Carries the access token
// when gating is enabled, plain otherwise.
export function playUrl(appUrl: string, slug: string): string {
  const base = `${appUrl}/play/${slug}`;
  return qrGatingEnabled() ? `${base}?k=${signSlug(slug)}` : base;
}
