You're working on Gameable Studios — a Next.js 14 (App Router) + TypeScript + Supabase
branded prize-game platform, positioned as a personal agency portfolio site (not a public
SaaS). Before changing anything, explore the codebase and confirm the current state — my
summary may be slightly stale (the README definitely is).

## Strategic goal
Right now the product is a one-shot game: fun, but a novelty clients can churn from. Make it
sticky by turning it into recurring value. The moat is the customer database each brand
accumulates plus the ability to re-activate it — the asset a client can't walk away from.
Prioritize work that moves us from "novelty game vendor" to "the system that owns our clients'
customer relationships."

## Hard constraints — do not violate
- MIGRATIONS ARE MANUAL. The Supabase CLI isn't linked. For any schema change, write a new
  numbered migration file (0011+) AND print the exact SQL for me to paste into the Supabase
  dashboard. Never assume migrations auto-apply.
- DO NOT break the public play flow. It deliberately bypasses RLS via the service-role admin
  client + SECURITY DEFINER RPCs (draw_prize_atomic, claim_prize_by_tier). Preserve the
  race-safety (FOR UPDATE SKIP LOCKED, atomic stock/voucher claim).
- Preserve the RLS ownership model (owner_id = auth.uid() join chain through brands).
- All third-party integrations must degrade to no-ops when their env vars are unset — match
  the existing pattern (Upstash, Turnstile, Resend).
- Positioning is agency portfolio, NOT public SaaS. Don't add public signup/onboarding. Keep
  the hidden admin gate (ADMIN_LOGIN_KEY) behavior.
- BILLING IS INTENTIONALLY MANUAL — clients pay me directly via PayNow. Do NOT wire any payment
  processor or build payment flows. Leave the billing page as-is.
- Match existing conventions: zod on API boundaries, the lib/ structure, the types/ definitions,
  TypeScript strict.

## How to work
- Just implement, working through the phases below in order. After each phase: make small,
  focused commits, update the README and types/ as needed, then print a short summary of what
  changed plus any migration SQL I must run. Then keep going to the next phase.
- Don't refactor unrelated code.
- If something's ambiguous or you find my summary was wrong about the code, make the sensible
  call and tell me what you decided — don't silently guess.

## Work, in priority order

### Phase 1 — Product health (quick wins)
- Image perf on the REAL play surface: GameWrapper / the /play/[slug] page still renders
  hero/overlay/bg images with raw <img>, so gameplay assets are unoptimized (only previews got
  the /_next/image fix). Route these through the Next optimizer too — this affects conversion on
  the actual product.
- Add a minimal test harness (idiomatic for this stack) covering only the money/fraud-critical
  paths: atomic prize draw + voucher claim, max_plays_per_player enforcement, velocity
  preflight/sweep thresholds, and the flagged-but-no-voucher path. These must never silently
  break.
- Refresh the stale README (admin is fully built, not a "Phase 3 placeholder").

### Phase 2 — Customer database as a first-class product (the core moat)
- leads (book-a-call) and players (game contacts) are currently separate. Build a unified,
  per-brand Customer view in admin: every captured contact with engagement history (plays, wins,
  redemptions, last-seen), segmentable by winners, repeat players, lapsed (no play in N days),
  and marketing-consented.
- Check whether marketing_consent exists on players/leads. If not, add it (migration) AND add a
  separate, optional, unchecked consent checkbox to PlayerCapture — distinct from the
  transactional capture, for PDPA compliance. Store consent + timestamp.

### Phase 3 — Re-engagement broadcast (turns the database into repeat revenue)
- Let the operator broadcast to a segment of past players via Resend (e.g. "play our new game" +
  campaign link). Respect marketing_consent strictly — only send to opted-in contacts. Record
  sends so they appear in analytics. This makes every past campaign a re-monetizable asset —
  the highest-value item after Phase 1.

### Phase 4 — Repeat-play / return-visit mechanics
- Build on max_plays_per_player + cooldown_hours to add return-visit rewards: collect-and-win
  (play across N visits to unlock a bigger prize) and/or streaks. Keep odds sustainable and
  server-controlled. Goal: shift from one-off acquisition to driving frequency — the KPI F&B
  owners actually care about.

### Phase 5 — Compounding ROI dashboard
- Add metrics that GROW with client tenure so cancelling feels like losing a growing asset:
  repeat-visit rate, redemptions-per-customer over time, customer-list growth over time. Place
  next to the existing recharts analytics.

### Phase 6 — Optional, do last, be careful
- The legacy game_type keys no longer match what they render (e.g. dice_roll → Plinko). This is
  a readability landmine but risky — it touches DB rows, seed, the builder, and the GameByType
  switch. Only attempt with a safe, REVERSIBLE migration, and clearly flag what changed. If you
  can't make it cleanly reversible, skip it and just document the mapping instead.

Start with Phase 1.
