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
