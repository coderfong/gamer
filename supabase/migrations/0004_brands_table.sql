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
