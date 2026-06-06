# PROJECT_BRIEF_PHASE_3.md

## Phase 3 — Brand admin dashboard (full spec)

Status when this brief was written:
- Phase 1 complete (tagged phase-1-complete)
- Phase 2 complete (tagged phase-2-complete)
- Phase 3 step 3.0 complete: brands table created in migration 0004
- Phase 3 step 3.1 complete: auth flow shipped, tagged phase-3-step-1-complete
- Phase 3 step 3.2 partial: admin shell + empty-state dashboard + welcome email shipped, tagged phase-3-step-2-complete. Several pieces still missing — see retro-fill section below.

This brief replaces all prior in-chat guidance for Phase 3. Read it end to end before resuming work.

---

## IMPLEMENTATION STATUS (updated 2026-06-06)

All of Phase 3 is implemented in code and the production build passes clean (`npm run build`, `npm run typecheck`). Committed on `master`:

- **3.2 retro-fill** — GAME_META, CampaignCard, dashboard server actions, URL filter/sort/search, loading/error/EmptyState.
- **3.0 schema** — `0005` (brands extras, `campaigns.brand_id` FK, RLS on all 7 tables), `0006` (brand_id NOT NULL), seed brand + brand_id backfill.
- **3.3 builder** — 5-step wizard (`/campaigns/new` + `/campaigns/[id]/edit`), admin API routes, `0007` brand-assets storage bucket + RLS, `/campaigns` list.
- **3.4 analytics** — `/campaigns/[id]/analytics` with recharts + CSV export + masking.
- **3.5 redemption** — `/campaigns/[id]/redemptions` with code search + html5-qrcode scan; redeem API.
- **3.6 preview** — `/campaigns/[id]/preview`; play API honors `?preview=1` with ownership guard, no writes.
- **3.7 billing** — `/billing` + invoice-request API; campaign-launched / low-inventory / invoice-request Resend templates.

**Still manual (cannot be done from code here):**
1. Apply migrations `0005`–`0007` and re-run `seed.sql` against the database (no local Supabase `config.toml` in this repo).
2. Create the `brand-assets` storage bucket if your environment doesn't run SQL bucket creation (the migration does `insert into storage.buckets`).
3. Set env: `NEXT_PUBLIC_OWNER_EMAIL`, `NEXT_PUBLIC_OWNER_PAYNOW_UEN` (billing), `RESEND_API_KEY`/`RESEND_FROM` (emails fall back to console stub otherwise).
4. Runtime end-to-end verification and the `phase-3-*-complete` git tags.

**Schema deviations from this brief** (adapted to the actual DB):
- DB campaign status uses `active` (not `live`); UI labels it "Live".
- Redemptions link via `voucher_codes.redeemed_at` + a `redemptions` row (table has `voucher_code_id`, not `play_id`); there is no `plays.redeemed_at` column.
- PayNow QR encodes the UEN as text, not a full EMVCo/SGQR payload (upgrade later if bank-scannable QR is needed).
- GAME_META keys match the existing `GameType` enum (27 entries), not the brief's hypothetical key list.

---

## 3.0 Schema completion (must verify before proceeding)

Verify these are in place. If not, write `0005_brands_extras.sql`:

```sql
ALTER TABLE brands ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_campaigns_brand ON campaigns(brand_id);
```

Then update seed.sql so all 5 test campaigns have `brand_id` set to the seed brand. Then write `0006_campaigns_brand_required.sql`:

```sql
ALTER TABLE campaigns ALTER COLUMN brand_id SET NOT NULL;
```

RLS policies for the 7 non-brand tables must enable RLS and add policies that scope every read/write to the authenticated user's brand. The invariant: every row a brand can see traces back to `brands.owner_id = auth.uid()` via the join chain.

```sql
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaigns scoped to brand" ON campaigns FOR ALL
  USING (brand_id IN (SELECT id FROM brands WHERE owner_id = auth.uid()))
  WITH CHECK (brand_id IN (SELECT id FROM brands WHERE owner_id = auth.uid()));

CREATE POLICY "Prizes scoped via campaign" ON prizes FOR ALL
  USING (campaign_id IN (
    SELECT id FROM campaigns WHERE brand_id IN (SELECT id FROM brands WHERE owner_id = auth.uid())
  ));

CREATE POLICY "Voucher codes scoped via prize" ON voucher_codes FOR ALL
  USING (prize_id IN (
    SELECT id FROM prizes WHERE campaign_id IN (
      SELECT id FROM campaigns WHERE brand_id IN (SELECT id FROM brands WHERE owner_id = auth.uid())
    )
  ));

CREATE POLICY "Plays readable via campaign" ON plays FOR SELECT
  USING (campaign_id IN (
    SELECT id FROM campaigns WHERE brand_id IN (SELECT id FROM brands WHERE owner_id = auth.uid())
  ));

CREATE POLICY "Redemptions writable via campaign" ON redemptions FOR ALL
  USING (play_id IN (
    SELECT id FROM plays WHERE campaign_id IN (
      SELECT id FROM campaigns WHERE brand_id IN (SELECT id FROM brands WHERE owner_id = auth.uid())
    )
  ));

CREATE POLICY "Fraud events readable via campaign" ON fraud_events FOR SELECT
  USING (campaign_id IN (
    SELECT id FROM campaigns WHERE brand_id IN (SELECT id FROM brands WHERE owner_id = auth.uid())
  ));

CREATE POLICY "Players readable via play" ON players FOR SELECT
  USING (id IN (
    SELECT player_id FROM plays WHERE campaign_id IN (
      SELECT id FROM campaigns WHERE brand_id IN (SELECT id FROM brands WHERE owner_id = auth.uid())
    )
  ));
```

Adapt foreign key column names if yours differ. Service-role admin client bypasses RLS, so the player API routes continue working.

---

## 3.2 retro-fill (do this before step 3.3)

Step 3.2 shipped an admin shell and empty-state dashboard but is missing the following. Build them before starting 3.3, since 3.3 depends on them.

### Retro-fill 1: GAME_META registry

Create `lib/games/gameMeta.ts`:

```typescript
export type GameCategory = 'chance' | 'skill'

export interface GameMeta {
  label: string
  icon: string
  description: string
  category: GameCategory
  enabled: boolean
}

export const GAME_META: Record<GameType, GameMeta> = {
  spin_wheel:       { label: 'Spin the Wheel',     icon: '🎯', description: 'Classic prize wheel with weighted segments', category: 'chance', enabled: true },
  scratch_card:     { label: 'Scratch Card',       icon: '🪙', description: 'Scratch to reveal your prize',                category: 'chance', enabled: true },
  quiz:             { label: 'Quiz',               icon: '🧠', description: 'Answer questions, win based on score',       category: 'skill',  enabled: true },
  slot_machine:     { label: 'Slot Machine',       icon: '🎰', description: '3-reel slot with prize on match',            category: 'chance', enabled: true },
  pick_a_box:       { label: 'Pick a Box',         icon: '📦', description: 'Choose 1 of N boxes to reveal prize',         category: 'chance', enabled: true },
  mystery_reveal:   { label: 'Mystery Reveal',     icon: '🎁', description: 'Stack of envelopes — tap to open one',        category: 'chance', enabled: false },
  fortune_cookie:   { label: 'Fortune Cookie',     icon: '🥠', description: 'Crack open to reveal fortune',                category: 'chance', enabled: false },
  mystery_envelope: { label: 'Mystery Envelope',   icon: '✉️', description: 'Tap to open the envelope',                    category: 'chance', enabled: false },
  treasure_chest:   { label: 'Treasure Chest',     icon: '💰', description: 'Open the chest for treasure',                 category: 'chance', enabled: false },
  gachapon:         { label: 'Gachapon',           icon: '🎁', description: 'Capsule machine surprise',                    category: 'chance', enabled: false },
  crack_egg:        { label: 'Crack the Egg',      icon: '🥚', description: 'Tap to crack and reveal prize',               category: 'chance', enabled: false },
  pop_balloon:      { label: 'Pop a Balloon',      icon: '🎈', description: 'Pop one of several balloons',                 category: 'chance', enabled: false },
  pull_string:      { label: 'Pull a String',      icon: '🪅', description: 'Pinata-style prize pull',                     category: 'chance', enabled: false },
  roll_dice:        { label: 'Roll the Dice',      icon: '🎲', description: '3D dice roll determines prize',               category: 'chance', enabled: false },
  flip_card:        { label: 'Flip a Card',        icon: '🃏', description: 'Single card flip reveal',                     category: 'chance', enabled: false },
  lottery_ball:     { label: 'Lottery Balls',      icon: '🎱', description: 'Tumbler drops winning numbers',               category: 'chance', enabled: false },
  personality_quiz: { label: 'Personality Quiz',   icon: '🧬', description: 'Answers map to personality and prize',        category: 'skill',  enabled: false },
  memory_match:     { label: 'Memory Match',       icon: '🧩', description: 'Find matching pairs',                          category: 'skill',  enabled: false },
  whack_a_mole:     { label: 'Whack-a-Mole',       icon: '🔨', description: 'Tap moles as they appear',                    category: 'skill',  enabled: false },
  tap_counter:      { label: 'Tap Counter',        icon: '👆', description: 'Tap as fast as you can',                       category: 'skill',  enabled: false },
  word_scramble:    { label: 'Word Scramble',      icon: '🔤', description: 'Unscramble the brand word',                    category: 'skill',  enabled: false },
  spot_difference:  { label: 'Spot the Difference',icon: '🔍', description: 'Find differences in two images',              category: 'skill',  enabled: false },
  trivia_race:      { label: 'Trivia Race',        icon: '⏱️', description: 'Speed-quiz with time bonuses',                 category: 'skill',  enabled: false },
  catch_falling:    { label: 'Catch Falling Items',icon: '🧺', description: 'Catch the good, avoid the bad',               category: 'skill',  enabled: false },
  plinko:           { label: 'Plinko',             icon: '🟡', description: 'Ball drops through pegs to a prize slot',     category: 'chance', enabled: false },
  dart_throw:       { label: 'Dart Throw',         icon: '🎯', description: 'Throw darts at a target',                     category: 'chance', enabled: false },
}

export function getEnabledGames(): Array<[GameType, GameMeta]> {
  return (Object.entries(GAME_META) as Array<[GameType, GameMeta]>).filter(([, m]) => m.enabled)
}
```

Match the keys to your actual GameType enum in DB.

### Retro-fill 2: CampaignCard component

`components/admin/CampaignCard.tsx` — client component, takes a `campaign` prop with plays_count, win_rate, vouchers_remaining as either pre-computed or fetched via the query.

Displays:
- Row 1: campaign name (truncate if long) + status badge (draft=gray, live=green, paused=yellow, ended=neutral)
- Row 2: GAME_META[campaign.game_type].icon + label
- Row 3: 3 stats inline — Plays, Win rate (% or "—" if 0 plays), Vouchers left (sum of total_stock - claimed across prizes)
- Row 4: dates formatted with date-fns ("Mar 1 – Mar 15")
- Row 5 actions: Edit, Analytics, Preview, Copy URL, three-dot menu
  - Edit/Analytics/Preview link to routes that may 404 until 3.3/3.4
  - Copy URL copies `{NEXT_PUBLIC_APP_URL}/play/{slug}` and shows shadcn toast
  - Three-dot dropdown menu: Duplicate, Pause/Resume (toggle by status), End, Delete (with AlertDialog confirm)

### Retro-fill 3: Dashboard server actions

`app/(admin)/dashboard/actions.ts`:

```typescript
'use server'

export async function pauseCampaign(id: string): Promise<{ ok: true } | { error: { code: string; message: string }}>
export async function resumeCampaign(id: string): Promise<...>
export async function endCampaign(id: string): Promise<...>
export async function duplicateCampaign(id: string): Promise<{ ok: true; newId: string } | { error: ... }>
export async function deleteCampaign(id: string): Promise<...>
```

Each:
- Uses server-side Supabase client (RLS-enforced)
- duplicateCampaign copies the campaign row + prizes, but NOT voucher_codes — brand uploads fresh ones
- deleteCampaign only allowed if status='draft' AND no plays exist; otherwise return error suggesting endCampaign instead
- Wrap in try/catch, call revalidatePath('/dashboard') on success

### Retro-fill 4: Filter + sort bar

Client component above campaign grid. State in URL params via useSearchParams + router.replace.
- Status filter: select with all/draft/live/paused/ended
- Sort: recent (default), most_plays, name_asc
- Search: text input filtering by campaign name (debounced 300ms)

### Retro-fill 5: loading.tsx + error.tsx + EmptyState

- `app/(admin)/dashboard/loading.tsx`: skeleton grid of 3-6 card placeholders
- `app/(admin)/dashboard/error.tsx`: error boundary with reset button
- `components/admin/EmptyState.tsx`: reusable component taking title, description, actionLabel, actionHref, optional icon

### Retro-fill 6: Mobile sidebar drawer (optional, lower priority)

If admin shell doesn't collapse to hamburger drawer at <768px, add it using shadcn Sheet. Defer if other things are pressing — brand admins use desktop primarily.

### Retro-fill exit criteria

- [x] GAME_META registry with all 27 entries (5 enabled, 22 disabled) — matched to the actual `GameType` enum in `lib/types/game.ts`
- [x] CampaignCard renders all required fields and actions
- [x] All 5 server actions work and refresh the list (`revalidatePath('/dashboard')`)
- [x] Filter/sort/search persist in URL params
- [x] loading.tsx and error.tsx in place
- [x] EmptyState used in dashboard
- [ ] Retro-fill 6 (mobile sidebar drawer) — N/A: admin shell uses a top nav bar, not a collapsible sidebar. Deferred.
- [ ] Tagged `phase-3-step-2-complete-v2` — pending (commit + tag is a manual step)

> NOTE: the dashboard query is written against the post-3.0 schema (campaigns scoped by RLS via `brands.owner_id`). Until migration `0005` adds `campaigns.brand_id` + RLS, the dashboard will show campaigns unscoped (or empty). Do 3.0 next.

---

## 3.3 Multi-step campaign builder

`/campaigns/new` and `/campaigns/[id]/edit` share the same component. Use shadcn Tabs as a stepper. Save progress to DB after each step.

The campaign starts as `status='draft'` on first save (step 1) and only flips to `'live'` after final launch in step 5.

### Step 1: Game Type

`components/admin/builder/GameTypePicker.tsx`:

- Visual grid of all 26 game types as cards (icon + label + description)
- Reads from GAME_META registry
- Disabled cards for `enabled: false` (greyed out, "Coming soon" tag)
- Selecting a card creates a draft campaign with that game_type via `POST /api/admin/campaigns` and advances to step 2

### Step 2: Theme

`components/admin/builder/ThemeStep.tsx`:

- Logo upload to Supabase Storage bucket `brand-assets/{brand_id}/logos/`
- Primary color picker
- Secondary color picker
- Background color picker
- Font family selector (limited: Inter, Poppins, Playfair Display, Roboto Mono)
- Live preview pane showing the selected game with current theme applied
- Stored in `campaigns.theme` JSONB column

### Step 3: Prizes

`components/admin/builder/PrizesStep.tsx`:

- Inline editable prize rows. Each: name, description, color, optional image, win_probability slider (0-100%), total_stock
- Validation: sum of probabilities ≤ 100% (consolation prize fills the rest)
- "Add consolation prize" toggle creates a prize with `is_loss=true`
- Voucher code upload per prize: textarea (one code per line) OR CSV via react-dropzone + papaparse
- Shows "X codes uploaded / Y stock needed" indicator
- For skill games, show "Min score" field per prize → populates `campaign.config.win_thresholds`

### Step 4: Settings

`components/admin/builder/SettingsStep.tsx`:

- Start datetime (default: now)
- End datetime (default: now + 14 days)
- Max plays total (optional, integer)
- Max plays per contact (default 1)
- Cooldown hours (default 24)
- Require phone toggle
- Require email toggle
- Redemption instructions textarea
- Prize validity text

### Step 5: Review and launch

`components/admin/builder/ReviewStep.tsx`:

- Read-only summary of all settings
- Generated public URL preview
- QR code preview using `qrcode` library
- Buttons: Save as draft (status='draft'), Launch (status='live')
- Validation before launch: theme set, ≥1 prize, voucher codes uploaded for non-consolation prizes
- After launch: success screen with Copy URL button + Download QR as PNG button

### Admin API routes

```
POST   /api/admin/campaigns                     — create draft (returns id)
PATCH  /api/admin/campaigns/[id]                — update fields
POST   /api/admin/campaigns/[id]/launch         — flip to live with validation
POST   /api/admin/campaigns/[id]/pause          — flip to paused
POST   /api/admin/campaigns/[id]/end            — flip to ended
POST   /api/admin/campaigns/[id]/voucher-codes  — bulk upload codes (array or CSV)
```

All require Supabase auth via server client (RLS-enforced). Return `{ error: { code, message } }` on failure.

### Storage bucket

Create Supabase Storage bucket `brand-assets`:
- Folders: `{brand_id}/logos/`, `{brand_id}/prize-images/`, `{brand_id}/campaign-backgrounds/`
- RLS policies on storage.objects: brands can write to their own folder
- Public read on all files in `brand-assets/*` (so player game pages display them without auth)

### 3.3 exit criteria

- [ ] /campaigns/new wizard with all 5 steps works
- [ ] Brand admin can create a draft campaign through all 5 steps in under 5 min
- [ ] /campaigns/[id]/edit loads existing draft and continues from any step
- [ ] Logo, prize image, background uploads land in correct storage paths
- [ ] Voucher code upload accepts both textarea and CSV
- [ ] Launch validation prevents launching without theme/prizes/codes
- [ ] Launched campaign appears as a CampaignCard on /dashboard with status=live
- [ ] Public URL works end-to-end (player can play, win, see voucher)
- [ ] Build passes clean
- [ ] Tagged `phase-3-step-3-complete`

---

## 3.4 Analytics dashboard

`/campaigns/[id]/analytics`:

- Stat cards at top: total plays, unique players (distinct by phone OR email), wins, win rate %, vouchers remaining, flagged plays
- Plays-over-time chart: Recharts line chart, default 7d, toggle 30d
- Prize distribution chart: pie or bar of awarded prizes
- Recent plays table (paginated 50/page): timestamp, masked contact (+65 ****1234 or j***@example.com), prize name, status (completed/flagged/pending redemption/redeemed)
- CSV export: full unmasked data (brand owns it under PDPA)
- Filters: date range, prize, status

### 3.4 exit criteria

- [ ] All 6 stat cards show correct numbers from real plays
- [ ] Charts render with seed data
- [ ] CSV export works
- [ ] Filters update results
- [ ] Tagged `phase-3-step-4-complete`

---

## 3.5 Redemption interface

`/campaigns/[id]/redemptions`:

- Top: search input "Enter voucher code" + "Scan QR" button
- QR scan: html5-qrcode library, opens phone camera, scans player's screenshot
- Lookup panel: voucher code, prize name, won_at, player contact (unmasked, brand-owned), redemption status
- "Mark as Redeemed" button: inserts redemptions row, sets plays.redeemed_at, captures redeemed_by as logged-in user email
- Below: recent redemptions list (last 50)

### API
```
POST /api/admin/plays/[playId]/redeem  — mark a play as redeemed
```

### 3.5 exit criteria

- [ ] Can paste voucher code and find the play
- [ ] Can scan QR with phone camera and find the play
- [ ] Mark as Redeemed creates redemption row and updates play
- [ ] Recent redemptions list shows latest 50
- [ ] Tagged `phase-3-step-5-complete`

---

## 3.6 Preview mode

`/campaigns/[id]/preview`:

Renders the player flow exactly as a player would, but plays don't count.

Implementation: pass `?preview=1` query param through to /api/play/[slug]/start and /submit. The API routes detect preview mode and:
- Skip rate limits, Turnstile, velocity checks
- Skip writes to plays, players, voucher_codes (no inventory consumed)
- Still run prize draw logic so the preview shows realistic outcomes
- Return result with `preview: true` flag

Guard: preview only works if requester is authenticated and owns the campaign (verify via Supabase server client). Otherwise 403. This prevents bots probing your prize logic.

### 3.6 exit criteria

- [ ] /campaigns/[id]/preview renders the player flow
- [ ] Plays in preview mode do NOT count in analytics
- [ ] Vouchers in preview mode are NOT claimed
- [ ] Unauthenticated requests get 403
- [ ] Brand admins of OTHER campaigns get 403
- [ ] Tagged `phase-3-step-6-complete`

---

## 3.7 Billing page + remaining emails

`/billing`:

- Display current subscription_tier (pilot/active/suspended)
- Active campaign count this month
- Plan limits hard-coded for now: pilot = 1 campaign, active = unlimited
- Contact card: owner email (from NEXT_PUBLIC_OWNER_EMAIL), PayNow QR (from NEXT_PUBLIC_OWNER_PAYNOW_UEN), instructions
- "Request invoice" form: campaign_count + notes textarea → emails owner via Resend

No payment forms, no Stripe, no card inputs.

### Resend templates to add

- Campaign launched: to brand admin when status flips to live; includes public URL + QR
- Low inventory alert: to brand admin when any prize's remaining stock <10% of total (triggered by Phase 5 cron, but template lives here)
- Invoice request received: to platform owner from /billing form

### API
```
POST /api/admin/billing/invoice-request — sends invoice request email
```

### 3.7 exit criteria

- [ ] /billing displays correct subscription tier and plan limits
- [ ] PayNow QR and owner email shown
- [ ] Invoice request form sends email
- [ ] Campaign launched email arrives when campaign goes live
- [ ] (Low inventory template exists but not triggered yet — Phase 5)
- [ ] Tagged `phase-3-step-7-complete`

---

## Phase 3 final criteria

When all 7 steps done:

- [ ] brands table + brand_id FK + RLS policies on all 7 tables
- [ ] Full auth flow (signup, login, logout, password reset)
- [ ] Admin shell + dashboard with real CampaignCard, filters, server actions
- [ ] 5-step campaign builder
- [ ] Analytics with charts and CSV export
- [ ] Redemption interface (search + QR scan)
- [ ] Preview mode
- [ ] /billing with PayNow + invoice request
- [ ] All admin API routes auth-protected, RLS-enforced
- [ ] npm run build passes clean
- [ ] Player flow at /play/[slug] still works end-to-end
- [ ] Tagged `phase-3-complete`

---

## Build order (recommended within Phase 3)

1. Retro-fill 3.2 first (GAME_META, CampaignCard, server actions, filters, loading/error/EmptyState). Tag as `phase-3-step-2-complete-v2`.
2. Then 3.0 schema completion if not done (brand_id FK, NOT NULL, RLS).
3. Then 3.3 campaign builder. Big step — break into substeps if needed: builder shell + step 1 first, then steps 2-5 progressively. Tag after each substep.
4. Then 3.4 analytics.
5. Then 3.5 redemption.
6. Then 3.6 preview.
7. Then 3.7 billing + emails.
8. Tag `phase-3-complete`.

After each numbered step, the app must still build and the player flow at /play/[slug] must still work end-to-end. If player flow breaks at any point, stop and fix before continuing.