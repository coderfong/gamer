-- gamer / 0014_client_portal.sql
-- Per-brand client portal access.
--
-- The operator can grant a client a read-only login to just their brand's
-- dashboard by setting a secret access key on the brand. The client signs in at
-- /portal with the brand's public slug + this key (or a one-click magic link);
-- the portal reads that brand's data via the service-role client, scoped to the
-- brand_id — so it never touches the operator's other brands or RLS model.
--
-- Stays consistent with the no-public-signup / key-gate philosophy
-- (cf. ADMIN_LOGIN_KEY): clients don't get Supabase auth accounts, just a
-- brand-scoped key the operator issues and can revoke.

alter table public.brands
  add column if not exists client_access_key text;
