-- gamer / 0012_broadcasts.sql
-- Phase 3: re-engagement broadcasts.
--
-- Records each marketing email blast the operator sends to a segment of past,
-- marketing-consented contacts (players + leads). One row per broadcast with the
-- content and delivery tally; the actual per-recipient send happens server-side
-- in /api/admin/broadcasts (service-role), which strictly filters to
-- marketing_consent = true. campaign_id (nullable) links a broadcast to the
-- campaign it promoted so the campaign's analytics can surface re-engagement.

create table if not exists public.broadcasts (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  subject     text not null,
  body        text not null,
  segment     text not null default 'consented',
  recipients  int  not null default 0,
  sent        int  not null default 0,
  failed      int  not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists broadcasts_owner_idx    on public.broadcasts (owner_id, created_at desc);
create index if not exists broadcasts_campaign_idx on public.broadcasts (campaign_id);

alter table public.broadcasts enable row level security;

-- Owners read/write only their own broadcasts. The service-role API insert
-- bypasses RLS; this policy governs the admin UI's RLS-scoped reads.
drop policy if exists "Broadcasts owned by creator" on public.broadcasts;
create policy "Broadcasts owned by creator" on public.broadcasts for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
