# gamer — branded prize-game platform

Phase 1 scaffold. End-to-end playable loop:

```
/play/:slug  →  capture (name, email)  →  SpinWheel  →  /api/submit  →  prize + voucher
```

## Stack
- Next.js 14 (App Router) + TypeScript + Tailwind
- Supabase (Postgres + RPC `draw_prize`)
- Zod input validation, in-process rate limiter (Phase 1 stub)

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in Supabase URL/keys.
3. Apply migrations to your Supabase project:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_draw_prize_function.sql`
4. Seed the test campaign: run `supabase/seed.sql`.
5. `npm run dev` and open `http://localhost:3000/play/test-campaign`.

## Verify Phase 1
1. Submit name + email on the capture screen.
2. Click "Spin!" and wait for the wheel to stop.
3. Result screen shows either a prize + voucher code (with QR + copy button) or "Better luck next time".
4. In Supabase, confirm:
   - one row in `players`
   - one row in `plays` with `status = 'completed'` and a `prize_id`
   - if non-loss: one row in `voucher_codes` flipped to `claimed_at not null`

## Layout
```
app/
  api/play/[slug]/{start,submit}/route.ts   — play APIs
  play/[slug]/page.tsx                      — player page
  admin/                                    — placeholder (Phase 2)
components/
  games/{GameWrapper,PlayerCapture,SpinWheel}.tsx
  shared/{ResultScreen,PrizeDisplay,VoucherCodeDisplay,ShareButton,BrandingPanel}.tsx
lib/
  supabase/{client,server,admin}.ts
  prizes/{drawPrize,skillScoreLookup}.ts
  fraud/rateLimit.ts                        — Phase 1 stub
  types/{database,campaign,game}.ts
  utils/{slug,validation,qrcode,cn}.ts
supabase/
  migrations/0001_initial_schema.sql
  migrations/0002_draw_prize_function.sql
  seed.sql
```

## What's NOT in Phase 1 (deferred)
- Admin UI (CampaignForm, PrizeEditor, ThemeCustomizer, VoucherCodeUploader, AnalyticsDashboard, RedemptionInterface, CampaignsList, GameTypeSelector) — scaffold only
- 25 more game components (only SpinWheel is real; others fall through to it via `GameByType`)
- Turnstile + fingerprint + velocity-check fraud layer
- Resend admin email notifications
- Cron velocity-check route
- Skill-game score → prize tier API path beyond what `draw_prize` supports
- Auth for admin

Once Phase 1 is verified end-to-end, tag and move to Phase 2:
```
git add -A && git commit -m "phase 1: playable e2e" && git tag phase-1-complete
```
