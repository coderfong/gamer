-- gamer / 0011_marketing_consent.sql
-- Phase 2: PDPA-style marketing consent on captured contacts.
--
-- Adds an explicit, opt-in marketing-consent flag (plus the moment it was given)
-- to both contact sources that feed the unified per-operator Customer view:
--   * players — captured by the public play flow (consent set from a separate,
--     optional, unchecked checkbox in PlayerCapture; transactional capture is
--     unchanged so playing never implies marketing consent).
--   * leads   — captured by the "Book a call" form. Column added for parity so a
--     lead can sit in the "marketing-consented" segment; default false.
--
-- Re-engagement broadcasts (Phase 3) must filter on marketing_consent = true.
-- Both columns are NOT NULL DEFAULT false, so existing rows are treated as
-- "no consent on record" — the safe default.

alter table public.players
  add column if not exists marketing_consent    boolean     not null default false,
  add column if not exists marketing_consent_at  timestamptz;

alter table public.leads
  add column if not exists marketing_consent    boolean     not null default false,
  add column if not exists marketing_consent_at  timestamptz;

-- The Customer view dedupes contacts by lower(email); these indexes keep that
-- aggregation and the players↔leads email match fast.
create index if not exists players_email_lower_idx on public.players (lower(email));
create index if not exists leads_email_lower_idx   on public.leads   (lower(email));
