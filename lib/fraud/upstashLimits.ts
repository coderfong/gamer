import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Three layers, all backed by Upstash sliding-window counters.
//
//   ip        — 5 plays per hour per IP (per campaign)
//   global    — 1000 plays per minute per campaign (DDoS guard)
//   contact   — 1 play per cooldown_hours per (campaign, email||phone)
//
// If UPSTASH env vars are missing, every check is a permissive no-op so local
// dev works without external dependencies. Mirrors the Turnstile stub pattern.

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;
let ipLimiter: Ratelimit | null = null;
let globalLimiter: Ratelimit | null = null;

if (url && token) {
  redis = new Redis({ url, token });
  ipLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    prefix: "rl:ip",
    analytics: false,
  });
  globalLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1000, "1 m"),
    prefix: "rl:global",
    analytics: false,
  });
}

// Contact limiter is constructed per-campaign because the window length
// (cooldown_hours) is variable. Cached by hour count.
const contactLimiters = new Map<number, Ratelimit>();
function contactLimiterFor(hours: number): Ratelimit | null {
  if (!redis) return null;
  let l = contactLimiters.get(hours);
  if (!l) {
    l = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1, `${hours} h`),
      prefix: "rl:contact",
      analytics: false,
    });
    contactLimiters.set(hours, l);
  }
  return l;
}

export interface LimitVerdict {
  ok: boolean;
  layer?: "ip" | "global" | "contact";
  retryAfterSec?: number;
  skipped?: boolean;
}

export async function checkAllLimits(args: {
  campaignId: string;
  ipHash: string;
  contact: string | null; // email or phone, normalized
  cooldownHours: number;
}): Promise<LimitVerdict> {
  if (!redis) return { ok: true, skipped: true };

  // Global first — cheapest signal that we're under sustained attack.
  if (globalLimiter) {
    const r = await globalLimiter.limit(`g:${args.campaignId}`);
    if (!r.success) {
      return { ok: false, layer: "global", retryAfterSec: secondsUntil(r.reset) };
    }
  }
  if (ipLimiter) {
    const r = await ipLimiter.limit(`${args.campaignId}:${args.ipHash}`);
    if (!r.success) {
      return { ok: false, layer: "ip", retryAfterSec: secondsUntil(r.reset) };
    }
  }
  if (args.contact) {
    const lim = contactLimiterFor(Math.max(1, args.cooldownHours));
    if (lim) {
      const r = await lim.limit(`${args.campaignId}:${args.contact.toLowerCase()}`);
      if (!r.success) {
        return { ok: false, layer: "contact", retryAfterSec: secondsUntil(r.reset) };
      }
    }
  }
  return { ok: true };
}

function secondsUntil(resetMs: number): number {
  return Math.max(1, Math.ceil((resetMs - Date.now()) / 1000));
}
