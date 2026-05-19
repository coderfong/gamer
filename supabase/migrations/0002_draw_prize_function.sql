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
