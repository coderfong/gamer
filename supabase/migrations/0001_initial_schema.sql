-- gamer / 0001_initial_schema.sql
-- Core tables for campaigns, players, plays, prizes, vouchers, redemptions.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ------------- campaigns -------------
create table if not exists campaigns (
  id            uuid primary key default uuid_generate_v4(),
  slug          text not null unique,
  name          text not null,
  game_type     text not null,                       -- e.g. "spin_wheel", "scratch", "memory" ...
  status        text not null default 'draft'
                check (status in ('draft','active','paused','ended')),
  starts_at     timestamptz,
  ends_at       timestamptz,
  theme         jsonb not null default '{}'::jsonb,  -- brand colors, logo url, fonts
  config        jsonb not null default '{}'::jsonb,  -- game-specific tuning
  max_plays_per_player int not null default 1,
  require_capture boolean not null default true,     -- collect name/email/phone before play
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists campaigns_status_idx on campaigns(status);

-- ------------- prizes -------------
create table if not exists prizes (
  id            uuid primary key default uuid_generate_v4(),
  campaign_id   uuid not null references campaigns(id) on delete cascade,
  name          text not null,
  description   text,
  image_url     text,
  tier          int not null default 1,              -- 1=top, higher=lower
  weight        int not null default 0,              -- relative draw weight (lottery games)
  stock_total   int,                                  -- null = unlimited
  stock_remaining int,
  is_loss       boolean not null default false,      -- "better luck next time" slot
  min_score     int,                                  -- for skill games
  max_score     int,
  created_at    timestamptz not null default now()
);
create index if not exists prizes_campaign_idx on prizes(campaign_id);

-- ------------- voucher_codes -------------
create table if not exists voucher_codes (
  id            uuid primary key default uuid_generate_v4(),
  prize_id      uuid not null references prizes(id) on delete cascade,
  code          text not null,
  claimed_at    timestamptz,
  claimed_by_play_id uuid,
  redeemed_at   timestamptz,
  created_at    timestamptz not null default now(),
  unique (prize_id, code)
);
create index if not exists voucher_codes_unclaimed_idx
  on voucher_codes(prize_id) where claimed_at is null;

-- ------------- players -------------
create table if not exists players (
  id            uuid primary key default uuid_generate_v4(),
  campaign_id   uuid not null references campaigns(id) on delete cascade,
  name          text,
  email         text,
  phone         text,
  fingerprint   text,
  ip_hash       text,
  created_at    timestamptz not null default now()
);
create index if not exists players_campaign_idx on players(campaign_id);
create index if not exists players_email_idx on players(campaign_id, email);

-- ------------- plays -------------
create table if not exists plays (
  id            uuid primary key default uuid_generate_v4(),
  campaign_id   uuid not null references campaigns(id) on delete cascade,
  player_id     uuid references players(id) on delete set null,
  prize_id      uuid references prizes(id),
  voucher_code_id uuid references voucher_codes(id),
  score         int,
  client_meta   jsonb not null default '{}'::jsonb,  -- ua, fingerprint, etc.
  ip_hash       text,
  status        text not null default 'completed'
                check (status in ('started','completed','flagged','voided')),
  started_at    timestamptz not null default now(),
  completed_at  timestamptz
);
create index if not exists plays_campaign_idx on plays(campaign_id);
create index if not exists plays_player_idx on plays(player_id);

-- ------------- redemptions -------------
create table if not exists redemptions (
  id            uuid primary key default uuid_generate_v4(),
  voucher_code_id uuid not null references voucher_codes(id) on delete cascade,
  redeemed_by   text,                                  -- admin email / staff id
  notes         text,
  created_at    timestamptz not null default now()
);

-- ------------- fraud_events -------------
create table if not exists fraud_events (
  id            uuid primary key default uuid_generate_v4(),
  campaign_id   uuid references campaigns(id) on delete cascade,
  play_id       uuid references plays(id) on delete set null,
  ip_hash       text,
  fingerprint   text,
  reason        text not null,
  details       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists fraud_events_campaign_idx on fraud_events(campaign_id);

-- ------------- updated_at trigger -------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

drop trigger if exists campaigns_updated_at on campaigns;
create trigger campaigns_updated_at before update on campaigns
  for each row execute function set_updated_at();
