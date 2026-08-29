-- Adds a sane rent ceiling and canonical whitespace to both anonymous write
-- RPCs. Client rendering escapes stored text; this migration keeps stored
-- listing content bounded and consistently formatted without HTML rewriting.
create or replace function validate_public_listing_input(
  p_area text, p_block text, p_description text, p_rent_kwd numeric, p_whatsapp_e164 text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(btrim(p_area), '') is null or char_length(p_area) > 80 then raise exception 'Area is required'; end if;
  if nullif(btrim(p_block), '') is null then raise exception 'Block is required'; end if;
  if char_length(coalesce(p_block, '')) > 80 then raise exception 'Block is too long'; end if;
  if nullif(btrim(p_description), '') is null then raise exception 'Description is required'; end if;
  if char_length(coalesce(p_description, '')) > 1000 then raise exception 'Description is too long'; end if;
  if p_rent_kwd is not null and (p_rent_kwd < 0 or p_rent_kwd > 10000 or p_rent_kwd <> round(p_rent_kwd, 3)) then raise exception 'Invalid KWD price'; end if;
  if p_whatsapp_e164 !~ '^\+[1-9][0-9]{5,14}$' then raise exception 'Invalid WhatsApp number'; end if;
end;
$$;

revoke all on function validate_public_listing_input(text, text, text, numeric, text) from public;

-- Collapses runs of spaces/tabs and excess blank lines, but keeps single
-- line breaks intact (unlike a full single-line flatten).
create or replace function normalize_listing_description(p_description text)
returns text
language sql
immutable
as $$
  select regexp_replace(regexp_replace(btrim(p_description), '[ \t]+', ' ', 'g'), '\n{3,}', E'\n\n', 'g');
$$;

revoke all on function normalize_listing_description(text) from public;

create or replace function create_public_listing(
  p_area text, p_block text, p_type text, p_description text, p_rent_kwd numeric,
  p_whatsapp_e164 text, p_edit_token text
)
returns table (id uuid, area text, block text, type text, description text, rent_kwd numeric,
  whatsapp_e164 text, status text, created_at timestamptz, expires_at timestamptz, edit_expires_at timestamptz)
language plpgsql security definer set search_path = public, extensions
as $$
declare new_listing listings%rowtype; clean_description text;
begin
  if length(p_edit_token) < 64 then raise exception 'Invalid edit token'; end if;
  perform validate_public_listing_input(p_area, p_block, p_description, p_rent_kwd, p_whatsapp_e164);
  clean_description := normalize_listing_description(p_description);
  insert into listings (area, block, type, description, rent_kwd, whatsapp_e164)
  values (btrim(p_area), nullif(btrim(p_block), ''), nullif(btrim(p_type), ''), clean_description, p_rent_kwd, p_whatsapp_e164)
  returning * into new_listing;
  insert into listing_edit_sessions (listing_id, token_hash, edit_lease_expires_at)
  values (new_listing.id, crypt(p_edit_token, gen_salt('bf')), now() + interval '2 minutes');
  return query select new_listing.id, new_listing.area, new_listing.block, new_listing.type,
    new_listing.description, new_listing.rent_kwd, new_listing.whatsapp_e164, new_listing.status,
    new_listing.created_at, new_listing.expires_at, now() + interval '2 minutes';
end;
$$;

create or replace function update_public_listing(
  p_listing_id uuid, p_edit_token text, p_area text, p_block text, p_type text,
  p_description text, p_rent_kwd numeric, p_whatsapp_e164 text
)
returns table (id uuid, area text, block text, type text, description text, rent_kwd numeric,
  whatsapp_e164 text, status text, created_at timestamptz, expires_at timestamptz)
language plpgsql security definer set search_path = public, extensions
as $$
declare updated_listing listings%rowtype; clean_description text;
begin
  perform validate_public_listing_input(p_area, p_block, p_description, p_rent_kwd, p_whatsapp_e164);
  clean_description := normalize_listing_description(p_description);
  update listings as l
  set area = btrim(p_area), block = nullif(btrim(p_block), ''), type = nullif(btrim(p_type), ''),
      description = clean_description, rent_kwd = p_rent_kwd, whatsapp_e164 = p_whatsapp_e164
  from listing_edit_sessions as s
  where l.id = p_listing_id and s.listing_id = l.id and s.edit_lease_expires_at > now()
    and s.token_hash = crypt(p_edit_token, s.token_hash)
  returning l.* into updated_listing;
  if updated_listing.id is null then raise exception 'The edit window has expired'; end if;
  update listing_edit_sessions set editing_started_at = null, edit_lease_expires_at = now()
  where listing_id = p_listing_id;
  return query select updated_listing.id, updated_listing.area, updated_listing.block,
    updated_listing.type, updated_listing.description, updated_listing.rent_kwd,
    updated_listing.whatsapp_e164, updated_listing.status, updated_listing.created_at,
    updated_listing.expires_at;
end;
$$;