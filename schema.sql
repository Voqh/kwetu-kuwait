-- ============================================================
-- KWETU KUWAIT — v1 schema
-- Run this once in Supabase: Project > SQL Editor > New query > Run
-- ============================================================

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

create table if not exists listings (
  id            uuid primary key default gen_random_uuid(),
  area          text not null,
  block         text,
  type          text not null check (type in ('Apartment', 'Room', 'Partition', 'Bedspace')),
  description   text,
  rent_kwd      numeric not null check (rent_kwd >= 0),
  whatsapp_e164 text not null,               -- e.g. +96550012345, built from country code + number
  status        text not null default 'active' check (status in ('active', 'reported')),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '30 days')
);

create index if not exists listings_area_idx on listings (area);
create index if not exists listings_expires_idx on listings (expires_at);

-- ---- Row Level Security: the real access-control layer ----
alter table listings enable row level security;

-- Anyone (no login) can post a listing.
create policy "public can insert listings"
  on listings for insert
  to anon
  with check (true);

-- Anyone can read listings, but ONLY if active and not yet expired.
-- This is what makes 30-day expiry "self-healing": no cron job required —
-- a listing just stops being returned once expires_at has passed.
create policy "public can read live listings"
  on listings for select
  to anon
  using (status = 'active' and expires_at > now());

-- No public update/delete policy is defined, so the anon key can never
-- edit or remove someone else's listing — that has to go through the
-- Supabase dashboard or a future admin tool.

-- ---- Optional: housekeeping ----
-- The RLS policy above already hides expired rows from everyone. This
-- function is only for actually clearing old rows out of the table so it
-- doesn't grow forever. Safe to skip for v1; add later via pg_cron if
-- you want it fully automatic (Database > Cron Jobs in the dashboard):
--   select cron.schedule('purge-expired-listings', '0 3 * * *',
--     $$ delete from listings where expires_at < now() - interval '7 days' $$);
create or replace function purge_expired_listings()
returns void
language sql
as $$
  delete from listings where expires_at < now() - interval '7 days';
$$;
