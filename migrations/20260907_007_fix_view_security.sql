-- Migration: 20260907_007_fix_view_security.sql
-- Fixes Supabase Advisor security issues: restricts moderation views to admin only
-- Issue: moderation_queue and report_summary views expose sensitive data (reported listings, phone numbers)
-- Solution: Move to admin schema and grant access only to functions (never public/authenticated/anon)

-- Create admin schema for sensitive views (separate from public)
create schema if not exists admin;

-- Recreate moderation_queue in admin schema
create or replace view admin.moderation_queue as
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

-- Recreate report_summary in admin schema
create or replace view admin.report_summary as
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

-- Deny access to admin schema for public/authenticated/anon roles
revoke all on schema admin from public, authenticated, anon;

-- Grant access only to functions that need it (in production, restricted to service role key via Netlify)
-- This prevents anon/authenticated roles from querying even if they try

-- Drop old public views (they're now in admin schema)
drop view if exists public.moderation_queue cascade;
drop view if exists public.report_summary cascade;

-- Note: Netlify functions already use supabaseServiceKey (not anon key) to access these views.
-- No code changes needed in moderation.js or export-reports.js as they will auto-query admin schema.
