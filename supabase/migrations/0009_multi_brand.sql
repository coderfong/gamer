-- gamer / 0009_multi_brand.sql
-- Multi-brand: a single account can now own many Brand Studio profiles.
--
-- 0004 declared `owner_id ... unique`, which capped each account at one brand.
-- Lifting that lets the /brands dashboard create + duplicate brands. RLS stays
-- correct: every owner policy is a per-row `owner_id = auth.uid()` check, which
-- works identically whether the owner has one brand or many. The non-unique
-- `brands_owner_idx` (also from 0004) keeps owner lookups fast.

alter table brands drop constraint if exists brands_owner_id_key;

-- Defensive: in case the unique surfaced as a standalone index on some envs.
drop index if exists brands_owner_id_key;
