// In-process bucket from Phase 1 is replaced by lib/fraud/upstashLimits.ts.
// This file now only exports the IP hash helper (used to avoid storing raw IPs).

export function ipHash(ip: string | null): string {
  if (!ip) return "anon";
  let h = 5381;
  for (let i = 0; i < ip.length; i++) h = ((h << 5) + h) ^ ip.charCodeAt(i);
  return (h >>> 0).toString(36);
}
