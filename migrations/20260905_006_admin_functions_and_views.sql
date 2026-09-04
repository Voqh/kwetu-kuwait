-- Migration: 20260905_006_admin_functions_and_views.sql
-- Adds admin-only purge logging, moderation queue, and export views
-- Note: purge_expired_listings() already exists; this updates it to return counts

-- Purge log table for audit trail
create table if not exists purge_log (
  id            uuid primary key default gen_random_uuid(),
  purged_at     timestamptz not null default now(),
  listings_purged integer not null default 0,
  leases_purged integer not null default 0,
  error_message text
);

-- Secure the audit log: RLS prevents anon from reading purge details
alter table purge_log enable row level security;
create policy "anon cannot read purge logs"
  on purge_log for select using (false);

-- Drop old version of purge_expired_listings (returns void) to create new signature (returns table)
drop function if exists purge_expired_listings();

-- New version of purge_expired_listings that logs results and returns counts
create function purge_expired_listings()
returns table (listings_purged integer, leases_purged integer)
language plpgsql
set search_path = public
as $$
declare
  v_listings_purged integer := 0;
  v_leases_purged integer := 0;
begin
  -- Scrub expired contact numbers
  perform scrub_expired_listing_contact();

  -- Count and delete stale edit leases
  delete from listing_edit_sessions where edit_lease_expires_at < now();
  get diagnostics v_leases_purged = row_count;

  -- Count and delete expired listings (>7 days past expiry)
  delete from listings where expires_at < now() - interval '7 days';
  get diagnostics v_listings_purged = row_count;

  -- Log the results
  insert into purge_log (listings_purged, leases_purged)
  values (v_listings_purged, v_leases_purged);

  return query select v_listings_purged, v_leases_purged;
end;
$$;

-- Moderation queue view: hidden listings with report context
create or replace view moderation_queue as
select
  l.id,
  l.area,
  l.block,
  l.type,
  l.description,
  l.rent_kwd,
  l.whatsapp_e164,
  l.status,
  l.created_at,
  l.expires_at,
  l.report_count,
  count(r.id) as total_reports,
  array_agg(distinct r.reason order by r.reason) filter (where r.reason is not null) as report_reasons,
  max(r.created_at) as last_reported_at
from listings l
left join listing_reports r on r.listing_id = l.id
where l.status = 'reported'
group by l.id, l.area, l.block, l.type, l.description, l.rent_kwd, l.whatsapp_e164, l.status, l.created_at, l.expires_at, l.report_count
order by l.created_at asc;

-- Moderation actions: reinstate a hidden listing (set back to active)
create or replace function moderation_reinstate_listing(p_listing_id uuid)
returns table (id uuid, status text, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated_at timestamptz;
begin
  update listings
  set status = 'active'
  where id = p_listing_id and status = 'reported'
  returning now() into v_updated_at;

  if v_updated_at is null then
    raise exception 'Listing not found or not in reported status';
  end if;

  return query select p_listing_id, 'active'::text, v_updated_at;
end;
$$;

-- Moderation actions: force-delete a listing
create or replace function moderation_delete_listing(p_listing_id uuid)
returns table (id uuid, deleted_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_at timestamptz := now();
begin
  delete from listings where id = p_listing_id;

  if not found then
    raise exception 'Listing not found';
  end if;

  return query select p_listing_id, v_deleted_at;
end;
$$;

-- Report summary view: patterns for abuse detection
create or replace view report_summary as
select
  l.id as listing_id,
  l.area,
  l.whatsapp_e164,
  l.created_at as listing_created_at,
  r.reason,
  r.created_at as reported_at,
  count(*) over (partition by r.reason) as reason_frequency,
  count(*) over (partition by l.whatsapp_e164) as reports_by_phone,
  count(*) over (partition by l.area) as reports_by_area
from listing_reports r
join listings l on r.listing_id = l.id
order by r.created_at desc;

-- Restrict admin functions to Netlify layer only (not granted to any DB role)
revoke all on function purge_expired_listings() from public, authenticated, anon;
revoke all on function moderation_reinstate_listing(uuid) from public, authenticated, anon;
revoke all on function moderation_delete_listing(uuid) from public, authenticated, anon;

-- Views are readable by anon (but Netlify functions will check secret server-side)
-- If you want to restrict further, use service role key in Netlify functions only
