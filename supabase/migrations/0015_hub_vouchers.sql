-- gamer / 0015_hub_vouchers.sql
-- Redeemable vouchers for brand play-hub wins.
--
-- When someone wins on a brand's hub and enters their email, we mint a unique
-- voucher code on their brand_signups row (the signup IS the voucher), so it can
-- be scanned + redeemed on the client portal's Redeem tab. Loss captures leave
-- voucher_code null. redeemed_at is stamped when the voucher is redeemed.

alter table public.brand_signups
  add column if not exists voucher_code text,
  add column if not exists prize_label  text,
  add column if not exists redeemed_at  timestamptz;

create index if not exists brand_signups_voucher_idx on public.brand_signups (brand_id, voucher_code);
