-- Seed a deterministic "test-campaign" for Phase 1 manual verification.
-- Idempotent: safe to re-run.

insert into campaigns (slug, name, game_type, status, theme, max_plays_per_player, require_capture)
values (
  'test-campaign',
  'Test Campaign',
  'spin_wheel',
  'active',
  '{"brandColor":"#6d28d9","brandFg":"#ffffff","logoUrl":null,"headline":"Spin to win!"}'::jsonb,
  3,
  true
)
on conflict (slug) do update set status = 'active', updated_at = now();

with c as (select id from campaigns where slug = 'test-campaign')
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

-- voucher codes (5 grand + 20 coffee + 100 10%-off)
with grand as (
  select id from prizes
  where campaign_id = (select id from campaigns where slug='test-campaign')
    and name = 'Grand prize: $50 gift card'
)
insert into voucher_codes (prize_id, code)
select grand.id, 'GRAND-' || lpad(g::text, 4, '0')
from grand, generate_series(1,5) g
on conflict do nothing;

with coffee as (
  select id from prizes
  where campaign_id = (select id from campaigns where slug='test-campaign')
    and name = 'Free coffee'
)
insert into voucher_codes (prize_id, code)
select coffee.id, 'COFFEE-' || lpad(g::text, 4, '0')
from coffee, generate_series(1,20) g
on conflict do nothing;

with disc as (
  select id from prizes
  where campaign_id = (select id from campaigns where slug='test-campaign')
    and name = '10% off'
)
insert into voucher_codes (prize_id, code)
select disc.id, 'TEN-' || lpad(g::text, 4, '0')
from disc, generate_series(1,100) g
on conflict do nothing;
