# Gameable Studios — branded prize-game platform

A personal agency portfolio site: I build branded, single-play prize games (spin-the-wheel,
scratch cards, skill games, …) for clients, and run them from a full admin. **Not** a public
SaaS — there's no public signup; the admin is reached via a hidden gate (`ADMIN_LOGIN_KEY`),
and billing is handled manually (clients pay via PayNow).

> The working brief / phase plan lives in [`PROJECT_BRIEF.md`](./PROJECT_BRIEF.md).

## Stack
- Next.js 14 (App Router) + TypeScript (strict) + Tailwind
- Supabase (Postgres + RLS; SECURITY DEFINER RPCs `draw_prize_atomic`, `claim_prize_by_tier`)
- Cloudflare Turnstile (server-verified) — no-op without keys
- Upstash Ratelimit (3-layer sliding window: per-IP, global, per-contact) — no-op without keys
- Resend (transactional + lifecycle emails) — falls back to a console stub without a key
- Custom velocity heuristics (preflight at `/start`, soft check at `/submit`, sweep cron)
- Vitest for the money/fraud-critical paths

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local`; fill at minimum Supabase. Turnstile / Upstash / Resend
   are optional in dev (they become no-ops when their env vars are unset).
3. Apply migrations in order (`supabase/migrations/0001` … `0012`). **Migrations are manual** —
   the Supabase CLI isn't linked, so paste each file's SQL into the Supabase dashboard.
4. Seed test campaigns + the demo brand: `supabase/seed.sql`
5. `npm run dev`

## Scripts
- `npm run dev` / `npm run build` / `npm run start`
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint`
- `npm test` — Vitest (money/fraud paths); `npm run test:watch` for watch mode

## Surfaces
- **Public play** — `/play/[slug]`: a single campaign's game (capture → play → result/voucher).
- **Brand hub** — `/b/[slug]`: a brand's public landing with all its games (the Studio output).
- **Admin** (hidden gate) — fully built:
  - `/dashboard` — campaign grid with filters, sort, search, and row actions
  - `/campaigns/new` + `/campaigns/[id]/edit` — 5-step campaign builder
  - `/campaigns/[id]/analytics` — recharts stats + CSV export (PDPA: brand owns the data)
  - `/campaigns/[id]/redemptions` — voucher search + QR scan + mark-redeemed
  - `/campaigns/[id]/preview` — owner dry-run; plays don't count, no vouchers claimed
  - `/campaigns/[id]/share` — public URL + QR
  - `/customers` — **unified customer database**: deduped players + leads with
    engagement history (plays/wins/redemptions/last-seen), segmentable (winners,
    repeat, lapsed, marketing-consented) and CSV-exportable
  - `/broadcasts` — **re-engagement**: email a segment of past customers via
    Resend. Sends ONLY to marketing-consented contacts; records each send (shown
    in history + on the promoted campaign's analytics). One-click unsubscribe.
  - `/brands`, `/brand/[id]` — Brand Studio (visual builder for a brand's game hub)
  - `/leads` — book-a-call leads; `/billing` — manual PayNow + invoice request

## Security pipeline at `/api/play/[slug]/start`
```
1. Validate body (zod)
2. Turnstile siteverify       → 403 on fail (no-op if no secret key)
3. Upstash checkAllLimits     → 429 on global / IP / contact bucket exhaustion
4. Velocity preflight (DB)    → 429 on IP / fingerprint / email clusters in last 5 min
5. Insert player + play       → 429 max_plays_reached if contact is at max_plays_per_player
```
**Return-visit rewards (collect-and-win):** when a campaign sets
`config.returnReward = { enabled, target, tier }` and allows repeat plays, every
`target`-th completed play by the same contact awards the prize at `tier`
(reserve it with weight 0 so it's never randomly drawn) via the atomic
`claim_prize_by_tier` RPC — falling back to the normal draw on non-milestone
visits and to the loss prize if the reward is out of stock. Configured in the
builder's Settings step; the result screen celebrates the milestone.

At `/api/play/[slug]/submit`: a soft velocity preflight repeats. If it trips, the play is
**flagged** — `draw_prize_atomic` is called with `p_flagged=true`, which picks a prize but skips
the stock decrement and voucher claim, and the route also withholds the code. The result screen
shows the prize visual with "Voucher pending verification — we'll contact you within 24 hours."

Cron sweep (`GET /api/cron/velocity-check`, Bearer `CRON_SECRET`) flags older accumulated
suspicious plays via the same thresholds.

Preview mode (`?preview=1`, owner-gated) and QR gating (`ADMIN_LOGIN_KEY`-signed token) wrap the
same routes; both degrade safely.

## Image optimization
Uploaded brand assets are raw, full-res PNGs in Supabase storage. Both the Studio previews and
the live play surface route them through Next's optimizer via `lib/brand/imageOpt.ts`
(`optimizedImage` / `optimizedImageList`); `optimizeHeroConfig` applies it to a campaign's stored
game config using the `HERO_SLOTS` registry in `lib/brand/gameAssets.ts`.

## Tests
`tests/` covers only the paths that must never silently break (run with `npm test`):
- velocity **preflight** + **sweep** thresholds (`tests/velocityCheck.test.ts`)
- `drawPrize` RPC contract — flagged passthrough, result mapping (`tests/drawPrize.test.ts`)
- route enforcement — `max_plays_per_player` and flagged-plays-never-leak-a-voucher
  (`tests/playRoutes.test.ts`)

They mock the Supabase admin client (`tests/helpers/mockSupabase.ts`) — no live DB required.

## Layout
```
app/
  play/[slug]/page.tsx                         — public single-campaign game
  b/[slug]/page.tsx                            — public brand hub
  (admin)/                                     — fully built brand admin
    dashboard, campaigns/{new,[id]/edit,[id]/{analytics,redemptions,preview,share}}
    brands, brand/[id], leads, billing
  api/play/[slug]/{start,submit}/route.ts      — public play flow (service-role, RLS-bypassing)
  api/admin/...                                — auth'd, RLS-enforced admin routes
  api/cron/velocity-check/route.ts             — fraud sweep
components/
  games/                                       — ~25 game components + GameWrapper (GameByType switch)
  shared/{ResultScreen,PrizeDisplay,VoucherCodeDisplay,ShareButton,BrandingPanel}.tsx
  admin/  play/                                — admin UI + public play hub
lib/
  supabase/{client,server,admin}.ts
  prizes/{drawPrize,skillScoreLookup,previewDraw}.ts
  fraud/{upstashLimits,turnstile,fingerprint,velocityCheck,rateLimit}.ts
  brand/{imageOpt,gameAssets}.ts               — asset optimization + hero-slot registry
  admin/{loadCampaignCards,loadCustomers}.ts   — dashboard + customer-database aggregation
  messaging/{resend,unsubscribe}.ts            — email (lifecycle + broadcasts) + opt-out tokens
  types/{database,campaign,game,studio}.ts
supabase/
  migrations/0001 … 0012 .sql
  seed.sql
tests/                                         — Vitest (money/fraud paths)
```

## Tags
- `phase-1-complete` — playable e2e, single game
- `phase-2-complete` — security stack + more games + skill scoring
- `phase-3-complete` — full brand admin: builder, analytics, redemption, preview, billing
- (later) brand studio, multi-brand, leads, and the customer-database / re-engagement work
  tracked in [`PROJECT_BRIEF.md`](./PROJECT_BRIEF.md)
