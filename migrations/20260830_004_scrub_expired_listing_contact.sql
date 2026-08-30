-- Hard-deletes the WhatsApp number from a listing as soon as it expires
-- (30 days after posting), instead of waiting for the full listing row to
-- be purged 7 days later. The listing itself (area/block/description) is
-- kept for that extra week purely so report/moderation history stays
-- linked to something; the personal contact number does not need to.

alter table listings alter column whatsapp_e164 drop not null;

create or replace function scrub_expired_listing_contact()
returns void
language sql
as $$
  update listings
  set whatsapp_e164 = null
  where expires_at <= now()
    and whatsapp_e164 is not null;
$$;

-- Runs the contact scrub before the existing 7-day purge, so both can be
-- invoked from the same scheduled job without changing the caller.
create or replace function purge_expired_listings()
returns void
language plpgsql
as $$
begin
  perform scrub_expired_listing_contact();

  delete from listing_edit_sessions where edit_lease_expires_at < now();
  delete from listings where expires_at < now() - interval '7 days';
end;
$$;
