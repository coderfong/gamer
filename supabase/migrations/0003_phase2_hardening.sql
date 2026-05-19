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
