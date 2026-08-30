-- Pins search_path on the two functions added in the previous migration —
-- every other function already has this; these two were missed.
create or replace function scrub_expired_listing_contact()
returns void
language sql
set search_path = public
as $$
  update listings
  set whatsapp_e164 = null
  where expires_at <= now()
    and whatsapp_e164 is not null;
$$;

create or replace function purge_expired_listings()
returns void
language plpgsql
set search_path = public
as $$
begin
  perform scrub_expired_listing_contact();

  delete from listing_edit_sessions where edit_lease_expires_at < now();
  delete from listings where expires_at < now() - interval '7 days';
end;
$$;

-- Supabase grants EXECUTE to the `authenticated` role by default when a
-- function is created, separately from the implicit PUBLIC grant. Earlier
-- migrations only revoked from `public` and re-granted to `anon`, leaving
-- `authenticated` with unnecessary access even though Kwetu has no sign-in.
revoke all on function create_public_listing(text, text, text, text, numeric, text, text) from public, authenticated;
revoke all on function begin_public_listing_edit(uuid, text) from public, authenticated;
revoke all on function update_public_listing(uuid, text, text, text, text, text, numeric, text) from public, authenticated;
revoke all on function report_listing(uuid, text) from public, authenticated;
revoke all on function get_listing_for_owner(uuid, text) from public, authenticated;
revoke all on function delete_public_listing(uuid, text) from public, authenticated;
revoke all on function scrub_expired_listing_contact() from public, authenticated;
revoke all on function purge_expired_listings() from public, authenticated;

grant execute on function create_public_listing(text, text, text, text, numeric, text, text) to anon;
grant execute on function begin_public_listing_edit(uuid, text) to anon;
grant execute on function update_public_listing(uuid, text, text, text, text, text, numeric, text) to anon;
grant execute on function report_listing(uuid, text) to anon;
grant execute on function get_listing_for_owner(uuid, text) to anon;
grant execute on function delete_public_listing(uuid, text) to anon;
