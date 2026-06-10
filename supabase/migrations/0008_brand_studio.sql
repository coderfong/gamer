-- gamer / 0008_brand_studio.sql
-- Brand Studio: a single per-brand configuration that themes every game and
-- powers a public "play hub" (one QR for all the brand's games).
--
-- `studio` holds the whole wizard state as JSON:
--   { theme, palette, logoUrl, games: { [gameType]: { hero, bg, overlays } } }
-- `public_slug` is the stable, shareable handle for the brand's play hub URL
--   (/b/<public_slug>). Generated lazily on first save.

alter table brands
  add column if not exists studio jsonb not null default '{}'::jsonb;

alter table brands
  add column if not exists public_slug text unique;

create index if not exists brands_public_slug_idx on brands(public_slug);

-- The play hub is public (anonymous visitors). Allow read of the columns the
-- hub needs by public slug. RLS: a permissive SELECT scoped to rows that have a
-- public_slug set. (Owners already have full access via the owner policy.)
drop policy if exists "brands_public_hub_select" on brands;
create policy "brands_public_hub_select"
  on brands for select
  using (public_slug is not null);
