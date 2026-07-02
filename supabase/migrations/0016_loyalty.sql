-- gamer / 0016_loyalty.sql
-- Recurring stamp-card loyalty (the retention product).
--
-- Members join a brand's rewards page (by phone, no password). Staff add a stamp
-- each visit from the portal. When a card fills, it mints a loyalty voucher the
-- staff redeem in-store. All public/staff writes go through the service-role
-- client + SECURITY DEFINER functions (which bypass RLS); the owner-scoped RLS
-- policies below only gate the admin app's authenticated reads.
--
-- Program config (goal, reward label) lives in brands.studio.stampCard — the app
-- passes it into loyalty_add_stamp, and each card snapshots its own goal.

-- ------------- loyalty_members -------------
create table if not exists loyalty_members (
  id                 uuid primary key default gen_random_uuid(),
  brand_id           uuid not null references brands(id) on delete cascade,
  name               text,
  phone              text not null,
  marketing_consent  boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (brand_id, phone)
);
create index if not exists loyalty_members_brand_idx on loyalty_members(brand_id);

-- ------------- loyalty_cards -------------
create table if not exists loyalty_cards (
  id          uuid primary key default gen_random_uuid(),
  brand_id    uuid not null references brands(id) on delete cascade,
  member_id   uuid not null references loyalty_members(id) on delete cascade,
  stamps      int not null default 0,
  goal        int not null default 5,
  status      text not null default 'active'
              check (status in ('active','completed','redeemed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists loyalty_cards_member_idx on loyalty_cards(member_id);
-- at most one active card per member
create unique index if not exists loyalty_cards_one_active
  on loyalty_cards(member_id) where status = 'active';

-- ------------- loyalty_vouchers -------------
create table if not exists loyalty_vouchers (
  id            uuid primary key default gen_random_uuid(),
  brand_id      uuid not null references brands(id) on delete cascade,
  member_id     uuid not null references loyalty_members(id) on delete cascade,
  card_id       uuid references loyalty_cards(id) on delete set null,
  code          text not null,
  reward_label  text not null,
  status        text not null default 'active'
                check (status in ('active','redeemed')),
  created_at    timestamptz not null default now(),
  redeemed_at   timestamptz,
  redeemed_by   text,
  unique (brand_id, code)
);
create index if not exists loyalty_vouchers_member_idx on loyalty_vouchers(member_id);
create index if not exists loyalty_vouchers_code_idx on loyalty_vouchers(brand_id, code);

-- ------------- updated_at triggers -------------
drop trigger if exists loyalty_members_updated_at on loyalty_members;
create trigger loyalty_members_updated_at before update on loyalty_members
  for each row execute function set_updated_at();

drop trigger if exists loyalty_cards_updated_at on loyalty_cards;
create trigger loyalty_cards_updated_at before update on loyalty_cards
  for each row execute function set_updated_at();

-- ------------- loyalty_add_stamp -------------
-- Adds one stamp to the member's active card (creating one if needed). When the
-- card reaches its goal it flips to 'completed' and mints a loyalty voucher.
-- Returns the resulting card state + any newly minted voucher code.
create or replace function loyalty_add_stamp(
  p_brand_id     uuid,
  p_member_id    uuid,
  p_goal         int,
  p_reward_label text
) returns table (
  card_id      uuid,
  stamps       int,
  goal         int,
  status       text,
  voucher_code text
) as $$
declare
  v_card_id uuid;
  v_stamps  int;
  v_goal    int;
  v_status  text;
  v_code    text;
begin
  select id, stamps, goal
    into v_card_id, v_stamps, v_goal
  from loyalty_cards
  where member_id = p_member_id and status = 'active'
  for update
  limit 1;

  if v_card_id is null then
    insert into loyalty_cards (brand_id, member_id, stamps, goal, status)
    values (p_brand_id, p_member_id, 0, greatest(coalesce(p_goal, 5), 1), 'active')
    returning id, stamps, goal into v_card_id, v_stamps, v_goal;
  end if;

  v_stamps := v_stamps + 1;

  if v_stamps >= v_goal then
    v_status := 'completed';
    v_code := 'LOY-' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8));
    update loyalty_cards set stamps = v_stamps, status = 'completed' where id = v_card_id;
    insert into loyalty_vouchers (brand_id, member_id, card_id, code, reward_label, status)
    values (p_brand_id, p_member_id, v_card_id, v_code,
            coalesce(nullif(p_reward_label, ''), 'Free reward'), 'active');
  else
    v_status := 'active';
    update loyalty_cards set stamps = v_stamps where id = v_card_id;
  end if;

  card_id := v_card_id; stamps := v_stamps; goal := v_goal; status := v_status; voucher_code := v_code;
  return next;
end;
$$ language plpgsql security definer;

-- ------------- loyalty_redeem_voucher -------------
-- Marks an active voucher redeemed and closes its card. Returns ok + label.
create or replace function loyalty_redeem_voucher(
  p_brand_id uuid,
  p_code     text,
  p_staff    text
) returns table (
  ok           boolean,
  reward_label text,
  already      boolean
) as $$
declare
  v_id     uuid;
  v_label  text;
  v_status text;
  v_card   uuid;
begin
  select id, reward_label, status, card_id
    into v_id, v_label, v_status, v_card
  from loyalty_vouchers
  where brand_id = p_brand_id and code = p_code
  for update;

  if v_id is null then
    ok := false; reward_label := null; already := false; return next; return;
  end if;
  if v_status = 'redeemed' then
    ok := false; reward_label := v_label; already := true; return next; return;
  end if;

  update loyalty_vouchers
     set status = 'redeemed', redeemed_at = now(), redeemed_by = p_staff
   where id = v_id;
  if v_card is not null then
    update loyalty_cards set status = 'redeemed' where id = v_card;
  end if;

  ok := true; reward_label := v_label; already := false; return next;
end;
$$ language plpgsql security definer;

-- ------------- RLS (owner-scoped reads for the admin app) -------------
alter table loyalty_members enable row level security;
drop policy if exists "loyalty_members owner" on loyalty_members;
create policy "loyalty_members owner" on loyalty_members for all
  using (brand_id in (select id from brands where owner_id = auth.uid()))
  with check (brand_id in (select id from brands where owner_id = auth.uid()));

alter table loyalty_cards enable row level security;
drop policy if exists "loyalty_cards owner" on loyalty_cards;
create policy "loyalty_cards owner" on loyalty_cards for all
  using (brand_id in (select id from brands where owner_id = auth.uid()))
  with check (brand_id in (select id from brands where owner_id = auth.uid()));

alter table loyalty_vouchers enable row level security;
drop policy if exists "loyalty_vouchers owner" on loyalty_vouchers;
create policy "loyalty_vouchers owner" on loyalty_vouchers for all
  using (brand_id in (select id from brands where owner_id = auth.uid()))
  with check (brand_id in (select id from brands where owner_id = auth.uid()));
