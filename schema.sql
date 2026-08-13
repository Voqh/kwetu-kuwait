create extension if not exists "pgcrypto";

-- Stores accommodation listings submitted by visitors.
create table if not exists listings (
  id            uuid primary key default gen_random_uuid(),
  area          text not null,
  block         text,
  type          text not null check (type in ('Apartment', 'Room', 'Partition', 'Bedspace')),
  description   text,
  rent_kwd      numeric not null check (rent_kwd >= 0),
  whatsapp_e164 text not null,
  status        text not null default 'active' check (status in ('active', 'reported')),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '30 days')
);

create index if not exists listings_area_idx on listings (area);
create index if not exists listings_expires_idx on listings (expires_at);

alter table listings enable row level security;

-- Allows visitors to create listings without a user account.
create policy "public can insert listings"
  on listings for insert
  to anon
  with check (true);

-- Limits public reads to active listings that have not expired.
create policy "public can read live listings"
  on listings for select
  to anon
  using (status = 'active' and expires_at > now());

-- Removes listings that expired more than seven days ago.
create or replace function purge_expired_listings()
returns void
language sql
as $$
  delete from listings where expires_at < now() - interval '7 days';
$$;
