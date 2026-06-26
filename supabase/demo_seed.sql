-- ============================================================================
-- DEMO DATA — synthetic activity so client dashboards look populated for demos.
-- NOT a migration. Paste into the Supabase SQL editor and run.
--
-- Every row is TAGGED so you can remove it later with the CLEANUP block at the
-- bottom:
--   campaigns      slug LIKE 'demo-%'        name starts '[DEMO] '
--   players        email LIKE '%@demo.example'
--   plays          client_meta->>'demo' = 'true'
--   voucher_codes  code LIKE 'DEMO-%'
--   brand_signups  source = 'demo'
--
-- Re-running ADDS more demo data (it doesn't dedupe). Run CLEANUP first if you
-- want a fresh set. Requires migrations through 0013 applied.
-- ============================================================================

do $$
declare
  b           record;
  c           int;
  camp_id     uuid;
  win_prizes  uuid[];
  loss_prize  uuid;
  pz          uuid;
  chosen      uuid;
  player_id   uuid;
  play_id     uuid;
  i           int;
  n_plays     int;
  n_signups   int;
  pool        int;
  ts          timestamptz;
  did_win     boolean;
  email       text;
  games       text[] := array['spin_wheel','scratch','dice_roll','lucky_dip','wheel_of_fortune','color_match'];
  gnames      text[] := array['Spin to Win','Scratch & Win','Drop & Win','Lucky Pick','Cup Shuffle','Pin Drop'];
  prize_names text[] := array['10% Off','Free Drink','Free Dessert'];
begin
  for b in
    select id, name, public_slug from public.brands
    where public_slug is not null and lower(name) <> 'seed brand'
  loop
    -- ── 2 demo campaigns per brand ──────────────────────────────────────────
    for c in 1..2 loop
      insert into public.campaigns
        (slug, name, game_type, status, brand_id, config, theme, max_plays_per_player, require_capture, starts_at)
      values
        ('demo-' || b.public_slug || '-' || c || '-' || substr(md5(random()::text), 1, 6),
         '[DEMO] ' || gnames[1 + ((c + length(b.public_slug)) % array_length(gnames, 1))],
         games[1 + ((c + length(b.public_slug)) % array_length(games, 1))],
         'active', b.id, '{}'::jsonb, '{}'::jsonb, 0, true, now() - interval '70 days')
      returning id into camp_id;

      -- 3 win prizes (varying odds) + 1 loss prize
      win_prizes := array[]::uuid[];
      for i in 1..3 loop
        insert into public.prizes
          (campaign_id, name, tier, weight, stock_total, stock_remaining, is_loss)
        values
          (camp_id, prize_names[i], i, (40 - i * 10), 500, 400 + floor(random() * 80)::int, false)
        returning id into pz;
        win_prizes := win_prizes || pz;
      end loop;
      insert into public.prizes (campaign_id, name, tier, weight, stock_total, stock_remaining, is_loss)
      values (camp_id, 'Try again', 9, 0, null, null, true)
      returning id into loss_prize;

      -- Plays + players over the last 60 days. A bounded customer pool means some
      -- people play more than once (repeat-rate metric).
      n_plays := 50 + floor(random() * 70)::int;
      pool    := greatest(8, (n_plays * 0.55)::int);
      for i in 1..n_plays loop
        ts      := now() - (random() * interval '60 days');
        did_win := random() < 0.5;
        email   := 'cust' || (1 + floor(random() * pool)::int) || '_' || b.public_slug || '@demo.example';
        chosen  := case when did_win then win_prizes[1 + floor(random() * 3)::int] else loss_prize end;

        insert into public.players
          (campaign_id, name, email, marketing_consent, marketing_consent_at, created_at)
        values
          (camp_id, 'Demo Player ' || i, email,
           random() < 0.6, case when random() < 0.6 then ts else null end, ts)
        returning id into player_id;

        insert into public.plays
          (campaign_id, player_id, prize_id, status, client_meta, started_at, completed_at)
        values
          (camp_id, player_id, chosen, 'completed', jsonb_build_object('demo', true), ts, ts)
        returning id into play_id;

        if did_win then
          insert into public.voucher_codes
            (prize_id, code, claimed_at, claimed_by_play_id, redeemed_at)
          values
            (chosen, 'DEMO-' || upper(substr(md5(random()::text), 1, 8)),
             ts, play_id,
             case when random() < 0.45 then ts + (random() * interval '6 days') else null end);
        end if;
      end loop;
    end loop;

    -- ── Brand-hub signups over the last 45 days ─────────────────────────────
    n_signups := 30 + floor(random() * 50)::int;
    for i in 1..n_signups loop
      ts := now() - (random() * interval '45 days');
      insert into public.brand_signups
        (brand_id, email, name, game_type, won, marketing_consent, source, created_at)
      values
        (b.id, 'signup' || i || '_' || b.public_slug || '@demo.example',
         'Demo Lead ' || i, games[1 + floor(random() * array_length(games, 1))::int],
         random() < 0.5, random() < 0.7, 'demo', ts);
    end loop;
  end loop;
end $$;

-- ============================================================================
-- CLEANUP — uncomment and run to remove ALL demo data.
-- ============================================================================
-- delete from public.brand_signups where source = 'demo';
-- delete from public.voucher_codes where code like 'DEMO-%';
-- delete from public.plays where client_meta->>'demo' = 'true';
-- delete from public.players where email like '%@demo.example';
-- delete from public.prizes where campaign_id in (select id from public.campaigns where slug like 'demo-%');
-- delete from public.campaigns where slug like 'demo-%';
