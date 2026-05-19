// Phase 1 stub: in-process token bucket per IP+campaign.
// Replace with Upstash/Redis or a Supabase function for production.

type Bucket = { tokens: number; refilledAt: number };
const buckets = new Map<string, Bucket>();

const CAPACITY = 10;
const REFILL_PER_SEC = 1; // 1 token per second

export function rateLimitCheck(key: string): { ok: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: CAPACITY, refilledAt: now };
  const elapsed = (now - b.refilledAt) / 1000;
  const refill = Math.floor(elapsed * REFILL_PER_SEC);
  if (refill > 0) {
    b.tokens = Math.min(CAPACITY, b.tokens + refill);
    b.refilledAt = now;
  }
  if (b.tokens <= 0) {
    buckets.set(key, b);
    return { ok: false, retryAfterMs: 1000 / REFILL_PER_SEC };
  }
  b.tokens -= 1;
  buckets.set(key, b);
  return { ok: true };
}

export function ipHash(ip: string | null): string {
  if (!ip) return "anon";
  // Cheap non-cryptographic hash; we just want to avoid storing raw IPs.
  let h = 5381;
  for (let i = 0; i < ip.length; i++) h = ((h << 5) + h) ^ ip.charCodeAt(i);
  return (h >>> 0).toString(36);
}
