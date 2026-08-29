-- Reasserts the edit-token and unexpired 10-minute lease check in the only
-- anonymous update path, so direct API calls cannot bypass the edit window.
create or replace function update_public_listing(
  p_listing_id uuid, p_edit_token text, p_area text, p_block text, p_type text,
  p_description text, p_rent_kwd numeric, p_whatsapp_e164 text
)
returns table (
  id uuid, area text, block text, type text, description text, rent_kwd numeric,
  whatsapp_e164 text, status text, created_at timestamptz, expires_at timestamptz
)
language plpgsql security definer set search_path = public, extensions
as $$
declare updated_listing listings%rowtype;
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
  if nullif(btrim(p_description), '') is null or char_length(p_description) > 1000 then
    raise exception 'Description is required';
  end if;
  if p_rent_kwd is not null and (p_rent_kwd < 0 or p_rent_kwd <> round(p_rent_kwd, 3)) then
    raise exception 'Invalid KWD price';
  end if;
  if p_whatsapp_e164 !~ '^\+[1-9][0-9]{5,14}$' then
    raise exception 'Invalid WhatsApp number';
  end if;

  update listings as l
  set area = btrim(p_area), block = nullif(btrim(p_block), ''),
      type = nullif(btrim(p_type), ''), description = nullif(btrim(p_description), ''),
      rent_kwd = p_rent_kwd, whatsapp_e164 = p_whatsapp_e164
  from listing_edit_sessions as s
  where l.id = p_listing_id and s.listing_id = l.id
    and s.edit_lease_expires_at > now()
    and s.token_hash = crypt(p_edit_token, s.token_hash)
  returning l.* into updated_listing;

  if updated_listing.id is null then
    raise exception 'The edit window has expired';
  end if;

  update listing_edit_sessions
  set editing_started_at = null, edit_lease_expires_at = now()
  where listing_id = p_listing_id;

  return query select updated_listing.id, updated_listing.area, updated_listing.block,
    updated_listing.type, updated_listing.description, updated_listing.rent_kwd,
    updated_listing.whatsapp_e164, updated_listing.status, updated_listing.created_at,
    updated_listing.expires_at;
end;
$$;