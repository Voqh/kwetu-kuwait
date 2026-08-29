create extension if not exists "pgcrypto";

-- Stores accommodation listings submitted by visitors.
create table if not exists listings (
  id            uuid primary key default gen_random_uuid(),
  area          text not null,
  block         text,
  type          text check (type in ('Apartment', 'Room', 'Partition', 'Bedspace')),
  description   text,
  rent_kwd      numeric check (rent_kwd is null or rent_kwd >= 0),
  whatsapp_e164 text not null,
  status        text not null default 'active' check (status in ('active', 'reported')),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '30 days'),
  report_count  integer not null default 0
);

-- Type is optional so older/simple listings can be published without it.
alter table listings alter column type drop not null;

-- Edit secrets are kept in a separate table with no public read access.
-- token_hash is permanent (never deleted after a successful edit) — it's
-- the visitor's only proof of ownership for their listing, forever, since
-- there are no accounts. edit_lease_expires_at is NOT the token's lifetime;
-- it's a short (10-minute) window during which an edit/save is allowed,
-- re-opened each time the owner starts editing (see begin_public_listing_edit).
create table if not exists listing_edit_sessions (
  listing_id            uuid primary key references listings(id) on delete cascade,
  token_hash            text not null,
  edit_lease_expires_at timestamptz not null,
  editing_started_at    timestamptz
);

alter table listing_edit_sessions enable row level security;
revoke all on table listing_edit_sessions from anon;
revoke insert, update, delete on table listings from anon;

create index if not exists listing_edit_sessions_lease_idx on listing_edit_sessions (edit_lease_expires_at);

-- One row per report. We don't try to identify the reporter (no accounts),
-- so this table exists to (a) count reports per listing and (b) keep a
-- lightweight audit trail of *why* something was reported. Dedup against
-- repeat clicks is handled client-side (localStorage) — see report_listing()
-- below for why that's an acceptable tradeoff here.
create table if not exists listing_reports (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references listings(id) on delete cascade,
  reason      text,
  created_at  timestamptz not null default now()
);

alter table listing_reports enable row level security;
revoke all on table listing_reports from anon;

create index if not exists listing_reports_listing_idx on listing_reports (listing_id);

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
set search_path = public, extensions
as $$
declare
  new_listing listings%rowtype;
begin
  if length(p_edit_token) < 64 then
    raise exception 'Invalid edit token';
  end if;
  if nullif(btrim(p_area), '') is null or char_length(p_area) > 80 then
    raise exception 'Area is required';
  end if;
  if nullif(btrim(p_block), '') is null then
    raise exception 'Block is required';
  end if;
  if char_length(coalesce(p_block, '')) > 80 then
    raise exception 'Block is too long';
  end if;
  if nullif(btrim(p_description), '') is null then
    raise exception 'Description is required';
  end if;
  if char_length(coalesce(p_description, '')) > 1000 then
    raise exception 'Description is too long';
  end if;
  if p_rent_kwd is not null and (p_rent_kwd < 0 or p_rent_kwd <> round(p_rent_kwd, 3)) then
    raise exception 'Invalid KWD price';
  end if;
  if p_whatsapp_e164 !~ '^\+[1-9][0-9]{5,14}$' then
    raise exception 'Invalid WhatsApp number';
  end if;

  insert into listings (area, block, type, description, rent_kwd, whatsapp_e164)
  values (
    btrim(p_area), nullif(btrim(p_block), ''), nullif(btrim(p_type), ''),
    nullif(btrim(p_description), ''), p_rent_kwd, p_whatsapp_e164
  )
  returning * into new_listing;

  insert into listing_edit_sessions (listing_id, token_hash, edit_lease_expires_at)
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
set search_path = public, extensions
as $$
declare
  session_expires_at timestamptz;
begin
  update listing_edit_sessions
  set
    editing_started_at = now(),
    edit_lease_expires_at = now() + interval '10 minutes'
  where listing_id = p_listing_id
    and token_hash = crypt(p_edit_token, token_hash)
  returning edit_lease_expires_at into session_expires_at;

  if session_expires_at is null then
    raise exception 'Invalid edit token';
  end if;
  return session_expires_at;
end;
$$;

-- Updates a listing only when the caller presents its valid, unexpired permanent token.
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
set search_path = public, extensions
as $$
declare
  updated_listing listings%rowtype;
begin
  if nullif(btrim(p_area), '') is null or char_length(p_area) > 80 then
    raise exception 'Area is required';
  end if;
  if nullif(btrim(p_block), '') is null then
    raise exception 'Block is required';
  end if;
  if char_length(coalesce(p_block, '')) > 80 then
    raise exception 'Block is too long';
  end if;
  if nullif(btrim(p_description), '') is null then
    raise exception 'Description is required';
  end if;
  if char_length(coalesce(p_description, '')) > 1000 then
    raise exception 'Description is too long';
  end if;
  if p_rent_kwd is not null and (p_rent_kwd < 0 or p_rent_kwd <> round(p_rent_kwd, 3)) then
    raise exception 'Invalid KWD price';
  end if;
  if p_whatsapp_e164 !~ '^\+[1-9][0-9]{5,14}$' then
    raise exception 'Invalid WhatsApp number';
  end if;

  update listings as l
  set
    area = btrim(p_area),
    block = nullif(btrim(p_block), ''),
    type = nullif(btrim(p_type), ''),
    description = nullif(btrim(p_description), ''),
    rent_kwd = p_rent_kwd,
    whatsapp_e164 = p_whatsapp_e164
  from listing_edit_sessions as s
  where l.id = p_listing_id
    and s.listing_id = l.id
    and s.edit_lease_expires_at > now()
    and s.token_hash = crypt(p_edit_token, s.token_hash)
  returning l.* into updated_listing;

  if updated_listing.id is null then
    raise exception 'The edit window has expired';
  end if;

  -- Close the lease WITHOUT deleting the row: token_hash must survive so
  -- the owner can open another edit (or delete the listing) later.
  update listing_edit_sessions
  set editing_started_at = null, edit_lease_expires_at = now()
  where listing_id = p_listing_id;

  return query select
    updated_listing.id, updated_listing.area, updated_listing.block, updated_listing.type,
    updated_listing.description, updated_listing.rent_kwd, updated_listing.whatsapp_e164,
    updated_listing.status, updated_listing.created_at, updated_listing.expires_at;
end;
$$;

-- Anonymous report intake. No accounts exist to rate-limit against, so this
-- deliberately keeps two independent, weak layers rather than one strong one:
--   1. Client-side: app.js remembers reported IDs in localStorage and disables
--      the button — stops accidental double-taps, not a determined abuser.
--   2. Server-side: this function is the ONLY writer of report_count, and it
--      auto-hides a listing (status -> 'reported', which RLS already excludes
--      from public reads) once reports cross REPORT_THRESHOLD. That threshold
--      is deliberately low (3) because false positives just mean a legit
--      poster re-publishes, while slow takedown of a scam/abuse listing is
--      the costlier failure mode for a no-login board like this one.
create or replace function report_listing(p_listing_id uuid, p_reason text default null)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  report_threshold constant integer := 3;
  new_count integer;
begin
  if not exists (select 1 from listings where id = p_listing_id) then
    raise exception 'Listing not found';
  end if;
  if char_length(coalesce(p_reason, '')) > 300 then
    raise exception 'Reason is too long';
  end if;

  insert into listing_reports (listing_id, reason)
  values (p_listing_id, nullif(btrim(coalesce(p_reason, '')), ''));

  update listings
  set report_count = report_count + 1
  where id = p_listing_id
  returning report_count into new_count;

  if new_count >= report_threshold then
    update listings set status = 'reported' where id = p_listing_id and status = 'active';
  end if;

  return new_count;
end;
$$;

-- Lets a verified owner see their own listing even if it's currently
-- 'reported' or past expires_at — states the public select policy already
-- excludes. security definer bypasses RLS; the token check is what stands
-- in for "ownership" since there are no accounts. Powers the My Listings page.
create or replace function get_listing_for_owner(p_listing_id uuid, p_edit_token text)
returns table (
  id uuid, area text, block text, type text, description text, rent_kwd numeric,
  whatsapp_e164 text, status text, created_at timestamptz, expires_at timestamptz,
  report_count integer
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  owns boolean;
begin
  select exists (
    select 1 from listing_edit_sessions s
    where s.listing_id = p_listing_id and s.token_hash = crypt(p_edit_token, s.token_hash)
  ) into owns;

  if not owns then
    raise exception 'Listing not found or token invalid';
  end if;

  return query
    select l.id, l.area, l.block, l.type, l.description, l.rent_kwd, l.whatsapp_e164,
           l.status, l.created_at, l.expires_at, l.report_count
    from listings l
    where l.id = p_listing_id;
end;
$$;

-- Deletes a listing given its (permanent) ownership token. No edit lease
-- required — deleting your own listing shouldn't need an open edit window.
-- listing_edit_sessions cascades on delete, so the token is cleaned up too.
create or replace function delete_public_listing(p_listing_id uuid, p_edit_token text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  owns boolean;
begin
  select exists (
    select 1 from listing_edit_sessions s
    where s.listing_id = p_listing_id and s.token_hash = crypt(p_edit_token, s.token_hash)
  ) into owns;

  if not owns then
    raise exception 'Listing not found or token invalid';
  end if;

  delete from listings where id = p_listing_id;
  return true;
end;
$$;

revoke all on function create_public_listing(text, text, text, text, numeric, text, text) from public;
revoke all on function begin_public_listing_edit(uuid, text) from public;
revoke all on function update_public_listing(uuid, text, text, text, text, text, numeric, text) from public;
revoke all on function report_listing(uuid, text) from public;
revoke all on function get_listing_for_owner(uuid, text) from public;
revoke all on function delete_public_listing(uuid, text) from public;
grant execute on function create_public_listing(text, text, text, text, numeric, text, text) to anon;
grant execute on function begin_public_listing_edit(uuid, text) to anon;
grant execute on function update_public_listing(uuid, text, text, text, text, text, numeric, text) to anon;
grant execute on function report_listing(uuid, text) to anon;
grant execute on function get_listing_for_owner(uuid, text) to anon;
grant execute on function delete_public_listing(uuid, text) to anon;

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
    delete from listing_edit_sessions where edit_lease_expires_at < now()
  )
  delete from listings where expires_at < now() - interval '7 days';
$$;
