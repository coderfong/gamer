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
