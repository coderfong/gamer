-- ============================================================
-- supabase/migrations/0001_initial_schema.sql
-- ============================================================
-- gamer / 0001_initial_schema.sql
-- Core tables for campaigns, players, plays, prizes, vouchers, redemptions.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ------------- campaigns -------------
create table if not exists campaigns (
  id            uuid primary key default uuid_generate_v4(),
  slug          text not null unique,
  name          text not null,
  game_type     text not null,                       -- e.g. "spin_wheel", "scratch", "memory" ...
  status        text not null default 'draft'
                check (status in ('draft','active','paused','ended')),
  starts_at     timestamptz,
  ends_at       timestamptz,
  theme         jsonb not null default '{}'::jsonb,  -- brand colors, logo url, fonts
  config        jsonb not null default '{}'::jsonb,  -- game-specific tuning
  max_plays_per_player int not null default 1,
  require_capture boolean not null default true,     -- collect name/email/phone before play
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists campaigns_status_idx on campaigns(status);

-- ------------- prizes -------------
create table if not exists prizes (
  id            uuid primary key default uuid_generate_v4(),
  campaign_id   uuid not null references campaigns(id) on delete cascade,
  name          text not null,
  description   text,
  image_url     text,
  tier          int not null default 1,              -- 1=top, higher=lower
  weight        int not null default 0,              -- relative draw weight (lottery games)
  stock_total   int,                                  -- null = unlimited
  stock_remaining int,
  is_loss       boolean not null default false,      -- "better luck next time" slot
  min_score     int,                                  -- for skill games
  max_score     int,
  created_at    timestamptz not null default now()
);
create index if not exists prizes_campaign_idx on prizes(campaign_id);

-- ------------- voucher_codes -------------
create table if not exists voucher_codes (
  id            uuid primary key default uuid_generate_v4(),
  prize_id      uuid not null references prizes(id) on delete cascade,
  code          text not null,
  claimed_at    timestamptz,
  claimed_by_play_id uuid,
  redeemed_at   timestamptz,
  created_at    timestamptz not null default now(),
  unique (prize_id, code)
);
create index if not exists voucher_codes_unclaimed_idx
  on voucher_codes(prize_id) where claimed_at is null;

-- ------------- players -------------
create table if not exists players (
  id            uuid primary key default uuid_generate_v4(),
  campaign_id   uuid not null references campaigns(id) on delete cascade,
  name          text,
  email         text,
  phone         text,
  fingerprint   text,
  ip_hash       text,
  created_at    timestamptz not null default now()
);
create index if not exists players_campaign_idx on players(campaign_id);
create index if not exists players_email_idx on players(campaign_id, email);

-- ------------- plays -------------
create table if not exists plays (
  id            uuid primary key default uuid_generate_v4(),
  campaign_id   uuid not null references campaigns(id) on delete cascade,
  player_id     uuid references players(id) on delete set null,
  prize_id      uuid references prizes(id),
  voucher_code_id uuid references voucher_codes(id),
  score         int,
  client_meta   jsonb not null default '{}'::jsonb,  -- ua, fingerprint, etc.
  ip_hash       text,
  status        text not null default 'completed'
                check (status in ('started','completed','flagged','voided')),
  started_at    timestamptz not null default now(),
  completed_at  timestamptz
);
create index if not exists plays_campaign_idx on plays(campaign_id);
create index if not exists plays_player_idx on plays(player_id);

-- ------------- redemptions -------------
create table if not exists redemptions (
  id            uuid primary key default uuid_generate_v4(),
  voucher_code_id uuid not null references voucher_codes(id) on delete cascade,
  redeemed_by   text,                                  -- admin email / staff id
  notes         text,
  created_at    timestamptz not null default now()
);

-- ------------- fraud_events -------------
create table if not exists fraud_events (
  id            uuid primary key default uuid_generate_v4(),
  campaign_id   uuid references campaigns(id) on delete cascade,
  play_id       uuid references plays(id) on delete set null,
  ip_hash       text,
  fingerprint   text,
  reason        text not null,
  details       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists fraud_events_campaign_idx on fraud_events(campaign_id);

-- ------------- updated_at trigger -------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

drop trigger if exists campaigns_updated_at on campaigns;
create trigger campaigns_updated_at before update on campaigns
  for each row execute function set_updated_at();

-- ============================================================
-- supabase/migrations/0002_draw_prize_function.sql
-- ============================================================
-- gamer / 0002_draw_prize_function.sql
-- Atomic prize draw + voucher claim.
--
-- Inputs:
--   p_campaign_id  uuid
--   p_play_id      uuid          (the play we're resolving)
--   p_score        int           (optional, used by skill games)
--
-- Behavior:
--   * If p_score is provided, prefer a prize where score is in [min_score, max_score].
--   * Otherwise weighted-random across prizes that still have stock.
--   * If a non-loss prize is selected, attempt to claim one unclaimed voucher_code
--     (SELECT ... FOR UPDATE SKIP LOCKED) and link it to the play.
--   * If no eligible prize / no stock / no voucher, falls back to any is_loss prize
--     (or returns NULL prize_id if none configured).
--
-- Returns the chosen prize_id, voucher_code_id, voucher code text.

create or replace function draw_prize(
  p_campaign_id uuid,
  p_play_id     uuid,
  p_score       int default null
) returns table (
  prize_id        uuid,
  voucher_code_id uuid,
  code            text
) as $$
declare
  v_prize_id        uuid;
  v_voucher_id      uuid;
  v_code            text;
  v_is_loss         boolean;
  v_total_weight    int;
  v_pick            int;
begin
  -- 1. Score-based selection (skill games)
  if p_score is not null then
    select id, is_loss
      into v_prize_id, v_is_loss
    from prizes
    where campaign_id = p_campaign_id
      and min_score is not null
      and p_score between min_score and coalesce(max_score, 2147483647)
      and (stock_remaining is null or stock_remaining > 0)
    order by tier asc
    limit 1;
  end if;

  -- 2. Weighted random (lottery games)
  if v_prize_id is null then
    select coalesce(sum(weight), 0)
      into v_total_weight
    from prizes
    where campaign_id = p_campaign_id
      and weight > 0
      and is_loss = false
      and (stock_remaining is null or stock_remaining > 0);

    if v_total_weight > 0 then
      v_pick := floor(random() * v_total_weight)::int;
      select id, is_loss
        into v_prize_id, v_is_loss
      from (
        select id, is_loss,
               sum(weight) over (order by id) - weight as lo,
               sum(weight) over (order by id) as hi
        from prizes
        where campaign_id = p_campaign_id
          and weight > 0
          and is_loss = false
          and (stock_remaining is null or stock_remaining > 0)
      ) ranked
      where v_pick >= lo and v_pick < hi
      limit 1;
    end if;
  end if;

  -- 3. Fallback to loss slot
  if v_prize_id is null then
    select id, is_loss
      into v_prize_id, v_is_loss
    from prizes
    where campaign_id = p_campaign_id and is_loss = true
    order by tier asc
    limit 1;
  end if;

  -- 4. Decrement stock and claim voucher for non-loss prizes
  if v_prize_id is not null and coalesce(v_is_loss, false) = false then
    update prizes
       set stock_remaining = stock_remaining - 1
     where id = v_prize_id
       and (stock_remaining is null or stock_remaining > 0);

    select vc.id, vc.code
      into v_voucher_id, v_code
    from voucher_codes vc
    where vc.prize_id = v_prize_id
      and vc.claimed_at is null
    order by vc.created_at asc
    for update skip locked
    limit 1;

    if v_voucher_id is not null then
      update voucher_codes
         set claimed_at = now(),
             claimed_by_play_id = p_play_id
       where id = v_voucher_id;
    end if;
  end if;

  -- 5. Link to the play row
  update plays
     set prize_id = v_prize_id,
         voucher_code_id = v_voucher_id,
         status = 'completed',
         completed_at = now()
   where id = p_play_id;

  prize_id := v_prize_id;
  voucher_code_id := v_voucher_id;
  code := v_code;
  return next;
end;
$$ language plpgsql security definer;

-- ============================================================
-- supabase/migrations/0003_phase2_hardening.sql
-- ============================================================
-- gamer / 0003_phase2_hardening.sql
-- Phase 2:
--   * Add campaigns.cooldown_hours (used by per-contact Upstash limiter)
--   * Replace draw_prize() with draw_prize_atomic(..., p_flagged boolean):
--       when p_flagged=true: pick prize but DO NOT decrement stock or claim a voucher,
--       and set play.status='flagged'. Otherwise behave as before.
--   * Add claim_prize_by_tier(): skill-game variant that takes a tier directly
--     (skillScoreLookup decides the tier from campaign.config.win_thresholds).

alter table campaigns
  add column if not exists cooldown_hours int not null default 24;

drop function if exists draw_prize(uuid, uuid, int);
drop function if exists draw_prize_atomic(uuid, uuid, int, boolean);

create or replace function draw_prize_atomic(
  p_campaign_id uuid,
  p_play_id     uuid,
  p_score       int default null,
  p_flagged     boolean default false
) returns table (
  prize_id        uuid,
  voucher_code_id uuid,
  code            text
) as $$
declare
  v_prize_id     uuid;
  v_voucher_id   uuid;
  v_code         text;
  v_is_loss      boolean;
  v_total_weight int;
  v_pick         int;
begin
  -- 1. Score-based pick (skill games using prizes.min_score/max_score; legacy)
  if p_score is not null then
    select id, is_loss
      into v_prize_id, v_is_loss
    from prizes
    where campaign_id = p_campaign_id
      and min_score is not null
      and p_score between min_score and coalesce(max_score, 2147483647)
      and (stock_remaining is null or stock_remaining > 0)
    order by tier asc
    limit 1;
  end if;

  -- 2. Weighted random for chance games
  if v_prize_id is null then
    select coalesce(sum(weight), 0)
      into v_total_weight
    from prizes
    where campaign_id = p_campaign_id
      and weight > 0
      and is_loss = false
      and (stock_remaining is null or stock_remaining > 0);

    if v_total_weight > 0 then
      v_pick := floor(random() * v_total_weight)::int;
      select id, is_loss
        into v_prize_id, v_is_loss
      from (
        select id, is_loss,
               sum(weight) over (order by id) - weight as lo,
               sum(weight) over (order by id) as hi
        from prizes
        where campaign_id = p_campaign_id
          and weight > 0
          and is_loss = false
          and (stock_remaining is null or stock_remaining > 0)
      ) ranked
      where v_pick >= lo and v_pick < hi
      limit 1;
    end if;
  end if;

  -- 3. Loss fallback
  if v_prize_id is null then
    select id, is_loss
      into v_prize_id, v_is_loss
    from prizes
    where campaign_id = p_campaign_id and is_loss = true
    order by tier asc
    limit 1;
  end if;

  -- 4. Stock + voucher claim — SKIPPED for flagged plays
  if v_prize_id is not null and coalesce(v_is_loss, false) = false and p_flagged = false then
    update prizes
       set stock_remaining = stock_remaining - 1
     where id = v_prize_id
       and (stock_remaining is null or stock_remaining > 0);

    select vc.id, vc.code
      into v_voucher_id, v_code
    from voucher_codes vc
    where vc.prize_id = v_prize_id
      and vc.claimed_at is null
    order by vc.created_at asc
    for update skip locked
    limit 1;

    if v_voucher_id is not null then
      update voucher_codes
         set claimed_at = now(),
             claimed_by_play_id = p_play_id
       where id = v_voucher_id;
    end if;
  end if;

  -- 5. Link play
  update plays
     set prize_id = v_prize_id,
         voucher_code_id = v_voucher_id,
         status = case when p_flagged then 'flagged' else 'completed' end,
         completed_at = now()
   where id = p_play_id;

  prize_id := v_prize_id;
  voucher_code_id := v_voucher_id;
  code := v_code;
  return next;
end;
$$ language plpgsql security definer;

-- Skill-game variant: tier comes from application code (skillScoreLookup).
create or replace function claim_prize_by_tier(
  p_campaign_id uuid,
  p_play_id     uuid,
  p_tier        int,
  p_flagged     boolean default false
) returns table (
  prize_id        uuid,
  voucher_code_id uuid,
  code            text
) as $$
declare
  v_prize_id   uuid;
  v_voucher_id uuid;
  v_code       text;
  v_is_loss    boolean;
begin
  -- pick first prize at requested tier with stock
  select id, is_loss
    into v_prize_id, v_is_loss
  from prizes
  where campaign_id = p_campaign_id
    and tier = p_tier
    and (stock_remaining is null or stock_remaining > 0)
  order by created_at asc
  limit 1;

  -- if none at this tier, fall back to any loss prize so the screen still resolves
  if v_prize_id is null then
    select id, is_loss
      into v_prize_id, v_is_loss
    from prizes
    where campaign_id = p_campaign_id and is_loss = true
    order by tier asc
    limit 1;
  end if;

  if v_prize_id is not null and coalesce(v_is_loss, false) = false and p_flagged = false then
    update prizes
       set stock_remaining = stock_remaining - 1
     where id = v_prize_id
       and (stock_remaining is null or stock_remaining > 0);

    select vc.id, vc.code
      into v_voucher_id, v_code
    from voucher_codes vc
    where vc.prize_id = v_prize_id
      and vc.claimed_at is null
    order by vc.created_at asc
    for update skip locked
    limit 1;

    if v_voucher_id is not null then
      update voucher_codes
         set claimed_at = now(),
             claimed_by_play_id = p_play_id
       where id = v_voucher_id;
    end if;
  end if;

  update plays
     set prize_id = v_prize_id,
         voucher_code_id = v_voucher_id,
         status = case when p_flagged then 'flagged' else 'completed' end,
         completed_at = now()
   where id = p_play_id;

  prize_id := v_prize_id;
  voucher_code_id := v_voucher_id;
  code := v_code;
  return next;
end;
$$ language plpgsql security definer;

-- ============================================================
-- supabase/migrations/0004_brands_table.sql
-- ============================================================
-- gamer / 0004_brands_table.sql
-- Phase 3 step 3.0: multi-tenancy root.
-- Each Supabase auth user maps 1:1 to a brand via owner_id UNIQUE.
--
-- NOTE: the original brief in chat was truncated at `contact_email TEXT, c...`
-- — the columns below match the visible portion + the obvious created_at/updated_at.
-- If the truncated columns included Stripe fields, logo_url, default_theme, etc.,
-- they should land in a follow-up migration (0005_brands_extras.sql) so I don't
-- guess at column names that won't match the eventual admin UI.

create table if not exists brands (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  owner_id           uuid not null unique references auth.users(id) on delete cascade,
  subscription_tier  text not null default 'pilot'
                     check (subscription_tier in ('pilot', 'active', 'suspended')),
  contact_email      text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists brands_owner_idx on brands(owner_id);

drop trigger if exists brands_updated_at on brands;
create trigger brands_updated_at before update on brands
  for each row execute function set_updated_at();

-- ------------- RLS -------------
-- Each owner sees only their own brand. service_role bypasses RLS, so our
-- admin client (lib/supabase/admin.ts) continues to work for backend writes.
alter table brands enable row level security;

drop policy if exists "brands_owner_select" on brands;
create policy "brands_owner_select"
  on brands for select
  using (owner_id = auth.uid());

drop policy if exists "brands_owner_update" on brands;
create policy "brands_owner_update"
  on brands for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "brands_owner_insert" on brands;
create policy "brands_owner_insert"
  on brands for insert
  with check (owner_id = auth.uid());

-- ============================================================
-- supabase/migrations/0005_brands_extras.sql
-- ============================================================
-- gamer / 0005_brands_extras.sql
-- Phase 3 step 3.0 (completion):
--   * brands extras (contact_phone, notes)
--   * campaigns.brand_id FK (nullable here; made NOT NULL in 0006 after backfill)
--   * Enable RLS + owner-scoped policies on the 7 non-brand tables.
--
-- Invariant: every row a brand can read/write traces back to
-- brands.owner_id = auth.uid() via the join chain. The player flow uses the
-- service-role client (lib/supabase/admin.ts) and SECURITY DEFINER functions,
-- both of which bypass RLS, so these policies don't affect public play/submit.

-- ------------- brands extras -------------
alter table brands add column if not exists contact_phone text;
alter table brands add column if not exists notes text;

-- ------------- campaigns.brand_id -------------
alter table campaigns
  add column if not exists brand_id uuid references brands(id) on delete cascade;
create index if not exists idx_campaigns_brand on campaigns(brand_id);

-- ------------- RLS: campaigns -------------
alter table campaigns enable row level security;

drop policy if exists "Campaigns scoped to brand" on campaigns;
create policy "Campaigns scoped to brand" on campaigns for all
  using (brand_id in (select id from brands where owner_id = auth.uid()))
  with check (brand_id in (select id from brands where owner_id = auth.uid()));

-- ------------- RLS: prizes (via campaign) -------------
alter table prizes enable row level security;

drop policy if exists "Prizes scoped via campaign" on prizes;
create policy "Prizes scoped via campaign" on prizes for all
  using (campaign_id in (
    select id from campaigns where brand_id in (select id from brands where owner_id = auth.uid())
  ))
  with check (campaign_id in (
    select id from campaigns where brand_id in (select id from brands where owner_id = auth.uid())
  ));

-- ------------- RLS: voucher_codes (via prize) -------------
alter table voucher_codes enable row level security;

drop policy if exists "Voucher codes scoped via prize" on voucher_codes;
create policy "Voucher codes scoped via prize" on voucher_codes for all
  using (prize_id in (
    select id from prizes where campaign_id in (
      select id from campaigns where brand_id in (select id from brands where owner_id = auth.uid())
    )
  ))
  with check (prize_id in (
    select id from prizes where campaign_id in (
      select id from campaigns where brand_id in (select id from brands where owner_id = auth.uid())
    )
  ));

-- ------------- RLS: plays (read-only for brands) -------------
alter table plays enable row level security;

drop policy if exists "Plays readable via campaign" on plays;
create policy "Plays readable via campaign" on plays for select
  using (campaign_id in (
    select id from campaigns where brand_id in (select id from brands where owner_id = auth.uid())
  ));

-- ------------- RLS: redemptions (writable via voucher chain) -------------
-- NOTE: our redemptions table links to voucher_code_id (not play_id as the
-- original brief assumed), so the chain is voucher_code -> prize -> campaign.
alter table redemptions enable row level security;

drop policy if exists "Redemptions scoped via voucher" on redemptions;
create policy "Redemptions scoped via voucher" on redemptions for all
  using (voucher_code_id in (
    select id from voucher_codes where prize_id in (
      select id from prizes where campaign_id in (
        select id from campaigns where brand_id in (select id from brands where owner_id = auth.uid())
      )
    )
  ))
  with check (voucher_code_id in (
    select id from voucher_codes where prize_id in (
      select id from prizes where campaign_id in (
        select id from campaigns where brand_id in (select id from brands where owner_id = auth.uid())
      )
    )
  ));

-- ------------- RLS: fraud_events (read-only for brands) -------------
alter table fraud_events enable row level security;

drop policy if exists "Fraud events readable via campaign" on fraud_events;
create policy "Fraud events readable via campaign" on fraud_events for select
  using (campaign_id in (
    select id from campaigns where brand_id in (select id from brands where owner_id = auth.uid())
  ));

-- ------------- RLS: players (read-only via play) -------------
alter table players enable row level security;

drop policy if exists "Players readable via play" on players;
create policy "Players readable via play" on players for select
  using (id in (
    select player_id from plays where campaign_id in (
      select id from campaigns where brand_id in (select id from brands where owner_id = auth.uid())
    )
  ));

-- ============================================================
-- supabase/migrations/0006_campaigns_brand_required.sql
-- ============================================================
-- gamer / 0006_campaigns_brand_required.sql
-- Phase 3 step 3.0 (completion): once every campaign has an owning brand,
-- make the link mandatory. Run AFTER 0005 and after any existing rows have
-- been backfilled with a brand_id (the seed assigns one to all test campaigns).
alter table campaigns alter column brand_id set not null;

-- ============================================================
-- supabase/migrations/0007_storage_brand_assets.sql
-- ============================================================
-- gamer / 0007_storage_brand_assets.sql
-- Phase 3 step 3.3: storage bucket for brand-uploaded assets.
--   Folders (by convention): {brand_id}/logos/, {brand_id}/prize-images/,
--                            {brand_id}/campaign-backgrounds/
--   Public read so player game pages can show images without auth.
--   Write restricted to the brand that owns the top-level {brand_id} folder.

insert into storage.buckets (id, name, public)
values ('brand-assets', 'brand-assets', true)
on conflict (id) do update set public = true;

-- Helper: the first path segment must be a brand id owned by the caller.
-- storage.foldername(name) returns the path segments as a text[].

drop policy if exists "brand-assets public read" on storage.objects;
create policy "brand-assets public read" on storage.objects for select
  using (bucket_id = 'brand-assets');

drop policy if exists "brand-assets owner insert" on storage.objects;
create policy "brand-assets owner insert" on storage.objects for insert
  with check (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] in (
      select id::text from brands where owner_id = auth.uid()
    )
  );

drop policy if exists "brand-assets owner update" on storage.objects;
create policy "brand-assets owner update" on storage.objects for update
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] in (
      select id::text from brands where owner_id = auth.uid()
    )
  );

drop policy if exists "brand-assets owner delete" on storage.objects;
create policy "brand-assets owner delete" on storage.objects for delete
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] in (
      select id::text from brands where owner_id = auth.uid()
    )
  );

-- ============================================================
-- supabase/seed.sql
-- ============================================================
-- gamer / seed.sql
-- Five test campaigns, one per game type.
-- Idempotent: safe to re-run. Slugs: test-spinwheel, test-scratch, test-quiz,
-- test-slot, test-pickbox.
--
-- Phase 3: campaigns.brand_id is NOT NULL (migration 0006), so every campaign
-- below is owned by a single seed brand created here. The seed brand needs an
-- auth.users owner; we insert a deterministic local-dev user for that. LOCAL/DEV
-- ONLY — never run this seed against production.

-- ----- 0. Seed auth user + brand (owner of all test campaigns) -----
-- Fixed UUIDs so re-runs and the campaign inserts below stay stable.
-- NOTE: GoTrue (Supabase Auth) scans the token columns below into non-nullable
-- Go strings; if a hand-inserted row leaves them NULL you get
-- "Database error querying schema" on login. So we set them to '' explicitly.
insert into auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token,
  email_change, email_change_token_new
)
values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-0000000000a1',
  'authenticated', 'authenticated', 'seed@example.com',
  crypt('password123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(),
  '', '', '', ''
)
on conflict (id) do nothing;

insert into brands (id, owner_id, name, subscription_tier, contact_email)
values (
  '00000000-0000-0000-0000-0000000000b1',
  '00000000-0000-0000-0000-0000000000a1',
  'Seed Brand', 'active', 'seed@example.com'
)
on conflict (owner_id) do nothing;

-- ----- 1. test-spinwheel (chance game; weighted random) -----
insert into campaigns (slug, name, game_type, status, theme, max_plays_per_player, require_capture, cooldown_hours, brand_id)
values (
  'test-spinwheel',
  'Spin Wheel Test',
  'spin_wheel',
  'active',
  '{"brandColor":"#6d28d9","brandFg":"#ffffff","headline":"Spin to win!"}'::jsonb,
  3, true, 24,
  '00000000-0000-0000-0000-0000000000b1'
)
on conflict (slug) do update set status = 'active', brand_id = excluded.brand_id, updated_at = now();

-- Migrate old 'test-campaign' rows to the new slug if they exist
update campaigns set slug = 'test-spinwheel'
 where slug = 'test-campaign' and not exists (select 1 from campaigns where slug = 'test-spinwheel' and id <> campaigns.id);

with c as (select id from campaigns where slug = 'test-spinwheel')
insert into prizes (campaign_id, name, description, tier, weight, stock_total, stock_remaining, is_loss)
select c.id, p.name, p.description, p.tier, p.weight, p.stock_total, p.stock_total, p.is_loss
from c
cross join (values
  ('Grand prize: $50 gift card', '$50 store credit',        1, 1,  5, false),
  ('Free coffee',                 'One free drink',          2, 5, 20, false),
  ('10% off',                     '10% off your next order', 3, 20,100, false),
  ('Better luck next time',       null,                      9, 0, null, true)
) as p(name, description, tier, weight, stock_total, is_loss)
where not exists (
  select 1 from prizes pr where pr.campaign_id = c.id and pr.name = p.name
);

with grand as (
  select id from prizes
  where campaign_id = (select id from campaigns where slug='test-spinwheel')
    and name = 'Grand prize: $50 gift card'
)
insert into voucher_codes (prize_id, code)
select grand.id, 'GRAND-' || lpad(g::text, 4, '0') from grand, generate_series(1,5) g
on conflict do nothing;

with coffee as (
  select id from prizes
  where campaign_id = (select id from campaigns where slug='test-spinwheel')
    and name = 'Free coffee'
)
insert into voucher_codes (prize_id, code)
select coffee.id, 'COFFEE-' || lpad(g::text, 4, '0') from coffee, generate_series(1,20) g
on conflict do nothing;

with disc as (
  select id from prizes
  where campaign_id = (select id from campaigns where slug='test-spinwheel')
    and name = '10% off'
)
insert into voucher_codes (prize_id, code)
select disc.id, 'TEN-' || lpad(g::text, 4, '0') from disc, generate_series(1,100) g
on conflict do nothing;

-- ----- 2. test-scratch (chance game) -----
insert into campaigns (slug, name, game_type, status, theme, config, max_plays_per_player, require_capture, cooldown_hours, brand_id)
values (
  'test-scratch',
  'Scratch Card Test',
  'scratch',
  'active',
  '{"brandColor":"#0ea5e9","brandFg":"#ffffff","headline":"Scratch to reveal!"}'::jsonb,
  '{"percentToReveal": 50}'::jsonb,
  3, true, 24,
  '00000000-0000-0000-0000-0000000000b1'
)
on conflict (slug) do update set status = 'active', brand_id = excluded.brand_id, updated_at = now();

with c as (select id from campaigns where slug = 'test-scratch')
insert into prizes (campaign_id, name, description, tier, weight, stock_total, stock_remaining, is_loss)
select c.id, p.name, p.description, p.tier, p.weight, p.stock_total, p.stock_total, p.is_loss
from c
cross join (values
  ('Premium reward', 'Top tier scratch prize', 1, 2, 10, false),
  ('Sticker pack',   'Pack of brand stickers', 2, 10, 50, false),
  ('Try again',      null,                     9, 0, null, true)
) as p(name, description, tier, weight, stock_total, is_loss)
where not exists (
  select 1 from prizes pr where pr.campaign_id = c.id and pr.name = p.name
);

with prem as (
  select id from prizes
  where campaign_id = (select id from campaigns where slug='test-scratch') and name='Premium reward'
)
insert into voucher_codes (prize_id, code)
select prem.id, 'SCR-PREM-' || lpad(g::text, 4, '0') from prem, generate_series(1,10) g
on conflict do nothing;

with stk as (
  select id from prizes
  where campaign_id = (select id from campaigns where slug='test-scratch') and name='Sticker pack'
)
insert into voucher_codes (prize_id, code)
select stk.id, 'SCR-STK-' || lpad(g::text, 4, '0') from stk, generate_series(1,50) g
on conflict do nothing;

-- ----- 3. test-quiz (SKILL game; uses win_thresholds → tier) -----
insert into campaigns (slug, name, game_type, status, theme, config, max_plays_per_player, require_capture, cooldown_hours, brand_id)
values (
  'test-quiz',
  'Quiz Test',
  'quiz',
  'active',
  '{"brandColor":"#16a34a","brandFg":"#ffffff","headline":"How well do you know us?"}'::jsonb,
  $$ {
    "passingScore": 2,
    "win_thresholds": [
      { "min_score": 3, "prize_tier": 1 },
      { "min_score": 2, "prize_tier": 2 },
      { "min_score": 0, "prize_tier": 9 }
    ],
    "questions": [
      { "question": "Best language for the web?", "options": ["COBOL","JavaScript","Pascal","Perl"], "correctAnswerIndex": 1, "points": 1 },
      { "question": "What does HTML stand for?", "options": ["HyperText Markup Language","HighText Machine Lang","HTMaker","None"], "correctAnswerIndex": 0, "points": 1 },
      { "question": "Which is a NoSQL DB?", "options": ["Postgres","MySQL","MongoDB","SQLite"], "correctAnswerIndex": 2, "points": 1 }
    ]
  } $$::jsonb,
  3, true, 24,
  '00000000-0000-0000-0000-0000000000b1'
)
on conflict (slug) do update set status = 'active', config = excluded.config, brand_id = excluded.brand_id, updated_at = now();

with c as (select id from campaigns where slug = 'test-quiz')
insert into prizes (campaign_id, name, description, tier, weight, stock_total, stock_remaining, is_loss)
select c.id, p.name, p.description, p.tier, p.weight, p.stock_total, p.stock_total, p.is_loss
from c
cross join (values
  ('Quiz champion',        'Top score reward', 1, 0, 10, false),
  ('Quiz runner-up',       'Decent score',     2, 0, 50, false),
  ('Thanks for playing',   null,               9, 0, null, true)
) as p(name, description, tier, weight, stock_total, is_loss)
where not exists (
  select 1 from prizes pr where pr.campaign_id = c.id and pr.name = p.name
);

with champ as (
  select id from prizes
  where campaign_id = (select id from campaigns where slug='test-quiz') and name='Quiz champion'
)
insert into voucher_codes (prize_id, code)
select champ.id, 'QUIZ-CHAMP-' || lpad(g::text, 4, '0') from champ, generate_series(1,10) g
on conflict do nothing;

with ru as (
  select id from prizes
  where campaign_id = (select id from campaigns where slug='test-quiz') and name='Quiz runner-up'
)
insert into voucher_codes (prize_id, code)
select ru.id, 'QUIZ-RU-' || lpad(g::text, 4, '0') from ru, generate_series(1,50) g
on conflict do nothing;

-- ----- 4. test-slot (chance game) -----
insert into campaigns (slug, name, game_type, status, theme, config, max_plays_per_player, require_capture, cooldown_hours, brand_id)
values (
  'test-slot',
  'Slot Machine Test',
  'slot_machine',
  'active',
  '{"brandColor":"#dc2626","brandFg":"#ffffff","headline":"Pull the lever!"}'::jsonb,
  '{"symbols": ["🍒","🍋","⭐","🔔","💎","7️⃣","🍀"]}'::jsonb,
  3, true, 24,
  '00000000-0000-0000-0000-0000000000b1'
)
on conflict (slug) do update set status = 'active', brand_id = excluded.brand_id, updated_at = now();

with c as (select id from campaigns where slug = 'test-slot')
insert into prizes (campaign_id, name, description, tier, weight, stock_total, stock_remaining, is_loss)
select c.id, p.name, p.description, p.tier, p.weight, p.stock_total, p.stock_total, p.is_loss
from c
cross join (values
  ('Jackpot',         '777 reward',  1, 1,  3, false),
  ('Small win',       'Token prize', 2, 8, 40, false),
  ('Try again',       null,          9, 0, null, true)
) as p(name, description, tier, weight, stock_total, is_loss)
where not exists (
  select 1 from prizes pr where pr.campaign_id = c.id and pr.name = p.name
);

with jp as (
  select id from prizes
  where campaign_id = (select id from campaigns where slug='test-slot') and name='Jackpot'
)
insert into voucher_codes (prize_id, code)
select jp.id, 'SLOT-JP-' || lpad(g::text, 4, '0') from jp, generate_series(1,3) g
on conflict do nothing;

with sw as (
  select id from prizes
  where campaign_id = (select id from campaigns where slug='test-slot') and name='Small win'
)
insert into voucher_codes (prize_id, code)
select sw.id, 'SLOT-SW-' || lpad(g::text, 4, '0') from sw, generate_series(1,40) g
on conflict do nothing;

-- ----- 5. test-pickbox (chance game; lucky_dip game type) -----
insert into campaigns (slug, name, game_type, status, theme, config, max_plays_per_player, require_capture, cooldown_hours, brand_id)
values (
  'test-pickbox',
  'Pick A Box Test',
  'lucky_dip',
  'active',
  '{"brandColor":"#d97706","brandFg":"#ffffff","headline":"Pick a box!"}'::jsonb,
  '{"boxCount": 6}'::jsonb,
  3, true, 24,
  '00000000-0000-0000-0000-0000000000b1'
)
on conflict (slug) do update set status = 'active', brand_id = excluded.brand_id, updated_at = now();

with c as (select id from campaigns where slug = 'test-pickbox')
insert into prizes (campaign_id, name, description, tier, weight, stock_total, stock_remaining, is_loss)
select c.id, p.name, p.description, p.tier, p.weight, p.stock_total, p.stock_total, p.is_loss
from c
cross join (values
  ('Mystery prize',      'Surprise item',   1, 2,  8, false),
  ('Free dessert',       'Voucher for one', 2, 6, 30, false),
  ('Better luck next time', null,           9, 0, null, true)
) as p(name, description, tier, weight, stock_total, is_loss)
where not exists (
  select 1 from prizes pr where pr.campaign_id = c.id and pr.name = p.name
);

with myst as (
  select id from prizes
  where campaign_id = (select id from campaigns where slug='test-pickbox') and name='Mystery prize'
)
insert into voucher_codes (prize_id, code)
select myst.id, 'BOX-MYST-' || lpad(g::text, 4, '0') from myst, generate_series(1,8) g
on conflict do nothing;

with des as (
  select id from prizes
  where campaign_id = (select id from campaigns where slug='test-pickbox') and name='Free dessert'
)
insert into voucher_codes (prize_id, code)
select des.id, 'BOX-DES-' || lpad(g::text, 4, '0') from des, generate_series(1,30) g
on conflict do nothing;

