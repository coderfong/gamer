# gamer — branded prize-game platform

## Stack
- Next.js 14 (App Router) + TypeScript + Tailwind
- Supabase (Postgres + RPCs `draw_prize_atomic`, `claim_prize_by_tier`)
- Cloudflare Turnstile (server-verified)
- Upstash Ratelimit (3-layer sliding-window: per-IP, global, per-contact)
- Custom velocity heuristics (preflight at `/start` + soft at `/submit` + sweep cron)

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local`; fill at minimum Supabase. Turnstile + Upstash are optional in dev (they become no-ops when env vars are unset).
3. Apply migrations in order:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_draw_prize_function.sql` *(Phase 1)*
   - `supabase/migrations/0003_phase2_hardening.sql` *(Phase 2 — replaces draw_prize with draw_prize_atomic + adds claim_prize_by_tier + cooldown_hours)*
4. Seed test campaigns: `supabase/seed.sql`
5. `npm run dev`

## Play these
- `/play/test-spinwheel` — weighted-random chance game
- `/play/test-scratch` — scratch-to-reveal
- `/play/test-quiz` — **skill** game; score determines prize tier
- `/play/test-slot` — slot machine
- `/play/test-pickbox` — pick-a-box (3D flip)

## Security pipeline at `/api/play/:slug/start`
```
1. Validate body (zod)
2. Turnstile siteverify       → 403 on fail (no-op if no secret key)
3. Upstash checkAllLimits     → 429 on global / IP / contact bucket exhaustion
4. Velocity preflight (DB)    → 429 on IP / fingerprint / email clusters in last 5 min
5. Insert player + play
```
At `/api/play/:slug/submit`: soft velocity preflight repeats. If it trips, the play is **flagged** — `draw_prize_atomic` is called with `p_flagged=true`, which picks a prize but skips voucher claim and stock decrement. The result screen shows the prize visual but withholds the code and renders "Voucher pending verification — we'll contact you within 24 hours."

Cron sweep (`GET /api/cron/velocity-check`, Bearer `CRON_SECRET`) flags older accumulated suspicious plays.

## Layout
```
app/
  api/play/[slug]/{start,submit}/route.ts
  api/cron/velocity-check/route.ts
  play/[slug]/page.tsx
  admin/                                       — placeholder (Phase 3)
components/
  games/{GameWrapper,PlayerCapture,SpinWheel,ScratchCard,Quiz,SlotMachine,PickABox}.tsx
  shared/{ResultScreen,PrizeDisplay,VoucherCodeDisplay,ShareButton,BrandingPanel}.tsx
lib/
  supabase/{client,server,admin}.ts
  prizes/{drawPrize,skillScoreLookup}.ts
  fraud/{upstashLimits,turnstile,fingerprint,velocityCheck,rateLimit}.ts
  types/{database,campaign,game}.ts
  utils/{slug,validation,qrcode,cn}.ts
supabase/
  migrations/0001_initial_schema.sql
  migrations/0002_draw_prize_function.sql
  migrations/0003_phase2_hardening.sql
  seed.sql
types/shims.d.ts                                — module declarations
```

## Manual verification checklist (Phase 2)
- [ ] All 5 test slugs render and complete on desktop
- [ ] Test on mobile at 375px width — touch interactions work
- [ ] Without Upstash env: every play succeeds (no-op fallback)
- [ ] With Upstash env set + cooldown_hours=24: second play from same email returns 429 `rate_limited:contact`
- [ ] With sweep manually triggered, a flagged play shows the prize but the voucher area is replaced by "pending verification"

## Tags
- `phase-1-complete` — playable e2e, single game
- `phase-2-complete` — security stack + 4 more games + skill scoring
