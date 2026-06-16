-- gamer / 0010_leads.sql
-- Prospecting leads captured by the public "Book a call" form.
--
-- Rows are inserted by the public /api/contact route (service-role) and viewed
-- by the operator at /leads. RLS is enabled with NO policies, so anon and
-- authenticated clients are denied — access is service-role only, keeping the
-- lead list private to the admin.

create table if not exists public.leads (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  phone      text,
  company    text,
  message    text,
  source     text not null default 'book_a_call',
  created_at timestamptz not null default now()
);

create index if not exists leads_created_idx on public.leads (created_at desc);

alter table public.leads enable row level security;
-- Intentionally no policies: only the service-role key (server-side) can read/write.
