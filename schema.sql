create extension if not exists "pgcrypto";

-- Stores accommodation listings submitted by visitors.
create table if not exists listings (
  id            uuid primary key default gen_random_uuid(),
  area          text not null,
  block         text,
  type          text check (type in ('Apartment', 'Room', 'Partition', 'Bedspace')),
  description   text,
  rent_kwd      numeric not null check (rent_kwd >= 0),
  whatsapp_e164 text not null,
  status        text not null default 'active' check (status in ('active', 'reported')),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '30 days')
);

-- Type is optional so older/simple listings can be published without it.
alter table listings alter column type drop not null;

-- Edit secrets are kept in a separate table with no public read access.
create table if not exists listing_edit_sessions (
  listing_id        uuid primary key references listings(id) on delete cascade,
  token_hash        text not null,
  expires_at        timestamptz not null,
  editing_started_at timestamptz
);

alter table listing_edit_sessions enable row level security;
revoke all on table listing_edit_sessions from anon;
revoke insert, update, delete on table listings from anon;

create index if not exists listing_edit_sessions_expires_idx on listing_edit_sessions (expires_at);

create index if not exists listings_area_idx on listings (area);
create index if not exists listings_expires_idx on listings (expires_at);

-- Kuwaiti dinar is subdivided into 1,000 fils, so prices allow at most three decimals.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'listings_rent_kwd_precision_check'
  ) then
    alter table listings
      add constraint listings_rent_kwd_precision_check
      check (rent_kwd = round(rent_kwd, 3));
  end if;
end $$;

-- Creates a listing and returns its public fields. The raw edit token is never stored.
create or replace function create_public_listing(
  p_area text,
  p_block text,
  p_type text,
  p_description text,
  p_rent_kwd numeric,
  p_whatsapp_e164 text,
  p_edit_token text
)
returns table (
  id uuid, area text, block text, type text, description text, rent_kwd numeric,
  whatsapp_e164 text, status text, created_at timestamptz, expires_at timestamptz,
  edit_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_listing listings%rowtype;
begin
  if length(p_edit_token) < 64 then
    raise exception 'Invalid edit token';
  end if;
  if nullif(btrim(p_area), '') is null or nullif(btrim(p_block), '') is null
    or char_length(p_area) > 80 or char_length(p_block) > 80 then
    raise exception 'Area and block are required';
  end if;
  if nullif(btrim(p_type), '') is null and nullif(btrim(p_description), '') is null then
    raise exception 'A type or description is required';
  end if;
  if char_length(coalesce(p_description, '')) > 1000 then
    raise exception 'Description is too long';
  end if;
  if p_rent_kwd is null or p_rent_kwd < 0 or p_rent_kwd <> round(p_rent_kwd, 3) then
    raise exception 'Invalid KWD price';
  end if;
  if p_whatsapp_e164 !~ '^\+[1-9][0-9]{5,14}$' then
    raise exception 'Invalid WhatsApp number';
  end if;

  insert into listings (area, block, type, description, rent_kwd, whatsapp_e164)
  values (
    btrim(p_area), btrim(p_block), nullif(btrim(p_type), ''),
    nullif(btrim(p_description), ''), p_rent_kwd, p_whatsapp_e164
  )
  returning * into new_listing;

  insert into listing_edit_sessions (listing_id, token_hash, expires_at)
  values (
    new_listing.id,
    crypt(p_edit_token, gen_salt('bf')),
    now() + interval '2 minutes'
  );

  return query select
    new_listing.id, new_listing.area, new_listing.block, new_listing.type,
    new_listing.description, new_listing.rent_kwd, new_listing.whatsapp_e164,
    new_listing.status, new_listing.created_at, new_listing.expires_at,
    now() + interval '2 minutes';
end;
$$;

-- Starting an edit pauses the browser countdown and creates a bounded 10-minute edit lease.
create or replace function begin_public_listing_edit(p_listing_id uuid, p_edit_token text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  session_expires_at timestamptz;
begin
  update listing_edit_sessions
  set
    editing_started_at = coalesce(editing_started_at, now()),
    expires_at = case
      when editing_started_at is null then now() + interval '10 minutes'
      else expires_at
    end
  where listing_id = p_listing_id
    and expires_at > now()
    and token_hash = crypt(p_edit_token, token_hash)
  returning expires_at into session_expires_at;

  if session_expires_at is null then
    raise exception 'The edit window has expired';
  end if;
  return session_expires_at;
end;
$$;

-- Updates a listing only when the caller presents its valid, unexpired one-time token.
create or replace function update_public_listing(
  p_listing_id uuid,
  p_edit_token text,
  p_area text,
  p_block text,
  p_type text,
  p_description text,
  p_rent_kwd numeric,
  p_whatsapp_e164 text
)
returns table (
  id uuid, area text, block text, type text, description text, rent_kwd numeric,
  whatsapp_e164 text, status text, created_at timestamptz, expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_listing listings%rowtype;
begin
  if nullif(btrim(p_area), '') is null or nullif(btrim(p_block), '') is null
    or char_length(p_area) > 80 or char_length(p_block) > 80 then
    raise exception 'Area and block are required';
  end if;
  if nullif(btrim(p_type), '') is null and nullif(btrim(p_description), '') is null then
    raise exception 'A type or description is required';
  end if;
  if char_length(coalesce(p_description, '')) > 1000 then
    raise exception 'Description is too long';
  end if;
  if p_rent_kwd is null or p_rent_kwd < 0 or p_rent_kwd <> round(p_rent_kwd, 3) then
    raise exception 'Invalid KWD price';
  end if;
  if p_whatsapp_e164 !~ '^\+[1-9][0-9]{5,14}$' then
    raise exception 'Invalid WhatsApp number';
  end if;

  update listings as l
  set
    area = btrim(p_area),
    block = btrim(p_block),
    type = nullif(btrim(p_type), ''),
    description = nullif(btrim(p_description), ''),
    rent_kwd = p_rent_kwd,
    whatsapp_e164 = p_whatsapp_e164
  from listing_edit_sessions as s
  where l.id = p_listing_id
    and s.listing_id = l.id
    and s.expires_at > now()
    and s.token_hash = crypt(p_edit_token, s.token_hash)
  returning l.* into updated_listing;

  if updated_listing.id is null then
    raise exception 'The edit window has expired';
  end if;

  delete from listing_edit_sessions where listing_id = p_listing_id;
  return query select
    updated_listing.id, updated_listing.area, updated_listing.block, updated_listing.type,
    updated_listing.description, updated_listing.rent_kwd, updated_listing.whatsapp_e164,
    updated_listing.status, updated_listing.created_at, updated_listing.expires_at;
end;
$$;

revoke all on function create_public_listing(text, text, text, text, numeric, text, text) from public;
revoke all on function begin_public_listing_edit(uuid, text) from public;
revoke all on function update_public_listing(uuid, text, text, text, text, text, numeric, text) from public;
grant execute on function create_public_listing(text, text, text, text, numeric, text, text) to anon;
grant execute on function begin_public_listing_edit(uuid, text) to anon;
grant execute on function update_public_listing(uuid, text, text, text, text, text, numeric, text) to anon;

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
  with expired_edit_sessions as (
    delete from listing_edit_sessions where expires_at < now()
  )
  delete from listings where expires_at < now() - interval '7 days';
$$;
