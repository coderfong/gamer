-- gamer / 0013_brand_signups.sql
-- Per-brand email capture from the public play hub (/b/<slug>).
--
-- When someone plays a brand's hub game and enters their email (to claim a win,
-- or for another try + news/offers on a loss), we store it here against that
-- brand. Public inserts happen via the service-role API route, so RLS only needs
-- to scope OWNER reads/writes; every row traces to brands.owner_id = auth.uid().

create table if not exists public.brand_signups (
  id                uuid primary key default gen_random_uuid(),
  brand_id          uuid not null references public.brands(id) on delete cascade,
  email             text not null,
  name              text,
  game_type         text,
  won               boolean,
  marketing_consent boolean not null default false,
  source            text not null default 'play_hub',
  created_at        timestamptz not null default now()
);

create index if not exists brand_signups_brand_idx on public.brand_signups (brand_id, created_at desc);
create index if not exists brand_signups_email_idx on public.brand_signups (brand_id, lower(email));

alter table public.brand_signups enable row level security;

drop policy if exists "Brand signups owned by brand owner" on public.brand_signups;
create policy "Brand signups owned by brand owner" on public.brand_signups for all
  using (brand_id in (select id from public.brands where owner_id = auth.uid()))
  with check (brand_id in (select id from public.brands where owner_id = auth.uid()));
