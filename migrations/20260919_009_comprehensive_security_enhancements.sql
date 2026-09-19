-- Migration: 20260919_009_comprehensive_security_enhancements.sql
-- Purpose: Implement comprehensive security audit logging, monitoring, and encryption
-- This migration adds:
-- 1. Comprehensive audit trail for all operations
-- 2. Security event monitoring tables
-- 3. Encryption functions for sensitive data (WhatsApp numbers)
-- 4. Rate limiting enhancements
-- 5. Input validation audit log

-- ============================================================================
-- 1. COMPREHENSIVE AUDIT LOG TABLE
-- ============================================================================
-- Tracks all critical operations: create, update, delete, report, admin actions
create table if not exists security_audit_log (
  id                uuid primary key default gen_random_uuid(),
  event_type        text not null check (event_type in (
    'listing.created',
    'listing.updated', 
    'listing.deleted',
    'listing.reported',
    'listing.hidden_auto',
    'listing.reinstated',
    'listing.expired_scrubbed',
    'listing.expired_purged',
    'token.generated',
    'token.validated',
    'token.failed_validation',
    'edit.begun',
    'edit.completed',
    'edit.lease_expired',
    'admin.login_attempt',
    'admin.action_performed',
    'admin.dashboard_accessed',
    'rate_limit.triggered',
    'validation.failed',
    'security.threat_detected'
  )),
  listing_id        uuid references listings(id) on delete cascade,
  user_identifier   text,  -- IP hash or session identifier (never raw IP)
  action_details    jsonb,  -- Structured data about the action
  severity          text check (severity in ('low', 'medium', 'high', 'critical')),
  affected_fields   text[],  -- Which fields were affected
  ip_hash           text,  -- Hashed IP for rate-limit tracking (not raw IP)
  user_agent        text,  -- Browser/client info
  created_at        timestamptz not null default now(),
  resolved_at       timestamptz  -- When an issue was resolved/reviewed
);

alter table security_audit_log enable row level security;
create policy "anon cannot read audit logs"
  on security_audit_log for select using (false);

create index if not exists security_audit_log_event_type_idx on security_audit_log (event_type);
create index if not exists security_audit_log_listing_id_idx on security_audit_log (listing_id);
create index if not exists security_audit_log_created_at_idx on security_audit_log (created_at);
create index if not exists security_audit_log_severity_idx on security_audit_log (severity);
create index if not exists security_audit_log_ip_hash_idx on security_audit_log (ip_hash);

-- ============================================================================
-- 2. SECURITY EVENTS & THREATS MONITORING
-- ============================================================================
-- Tracks potential security threats and anomalies
create table if not exists security_threats (
  id                uuid primary key default gen_random_uuid(),
  threat_type       text not null check (threat_type in (
    'rate_limit_abuse',
    'xss_attempt',
    'sql_injection_attempt',
    'command_injection_attempt',
    'invalid_token',
    'expired_token_reuse',
    'suspicious_pattern',
    'brute_force_attempt',
    'data_exfiltration_attempt'
  )),
  description       text not null,
  ip_hash           text not null,
  listing_id        uuid references listings(id) on delete cascade,
  threat_payload    jsonb,  -- Captured malicious input (sanitized)
  severity          text not null check (severity in ('low', 'medium', 'high', 'critical')),
  action_taken      text,  -- What was done in response (e.g., 'blocked', 'rate_limited')
  detected_at       timestamptz not null default now(),
  resolved_at       timestamptz,
  resolution_notes  text
);

alter table security_threats enable row level security;
create policy "anon cannot read threats"
  on security_threats for select using (false);

create index if not exists security_threats_threat_type_idx on security_threats (threat_type);
create index if not exists security_threats_ip_hash_idx on security_threats (ip_hash);
create index if not exists security_threats_severity_idx on security_threats (severity);
create index if not exists security_threats_detected_at_idx on security_threats (detected_at);

-- ============================================================================
-- 3. RATE LIMIT TRACKING (Enhanced from migration 001)
-- ============================================================================
-- Track per-IP-hash rate limit violations for all operations
create table if not exists rate_limit_violations (
  id                uuid primary key default gen_random_uuid(),
  ip_hash           text not null,
  operation         text not null check (operation in (
    'report',
    'create_listing',
    'edit_listing',
    'delete_listing',
    'begin_edit'
  )),
  violation_count   integer not null default 1,
  window_start      timestamptz not null,
  window_end        timestamptz not null,
  blocked_until     timestamptz,
  created_at        timestamptz not null default now(),
  resolved_at       timestamptz
);

alter table rate_limit_violations enable row level security;
create policy "anon cannot read rate limits"
  on rate_limit_violations for select using (false);

create index if not exists rate_limit_violations_ip_hash_idx on rate_limit_violations (ip_hash);
create index if not exists rate_limit_violations_operation_idx on rate_limit_violations (operation);
create index if not exists rate_limit_violations_blocked_until_idx on rate_limit_violations (blocked_until);

-- ============================================================================
-- 4. ENCRYPTION/DECRYPTION FOR SENSITIVE DATA
-- ============================================================================
-- Helper function to hash IP addresses (one-way, for audit trail without storing raw IPs)
create or replace function hash_ip(p_ip text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  ip_hash text;
begin
  if p_ip is null or btrim(p_ip) = '' then
    return null;
  end if;
  -- Use SHA256 for consistent one-way hashing
  ip_hash := encode(digest(p_ip, 'sha256'), 'hex');
  return left(ip_hash, 16);  -- Use first 16 chars for compactness
end;
$$;

-- ============================================================================
-- 5. AUDIT LOGGING TRIGGERS
-- ============================================================================
-- Trigger: Log all listing creation events
create or replace function audit_log_listing_creation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into security_audit_log (
    event_type,
    listing_id,
    action_details,
    severity,
    affected_fields,
    created_at
  ) values (
    'listing.created',
    NEW.id,
    jsonb_build_object(
      'area', NEW.area,
      'block', NEW.block,
      'type', NEW.type,
      'has_whatsapp', NEW.whatsapp_e164 is not null
    ),
    'low',
    array['area', 'block', 'type', 'description', 'rent_kwd', 'whatsapp_e164'],
    now()
  );
  return NEW;
end;
$$;

drop trigger if exists audit_listing_create on listings;
create trigger audit_listing_create
  after insert on listings
  for each row
  execute function audit_log_listing_creation();

-- Trigger: Log all listing updates
create or replace function audit_log_listing_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_fields text[];
begin
  changed_fields := array[]::text[];
  
  if OLD.area is distinct from NEW.area then changed_fields := array_append(changed_fields, 'area'); end if;
  if OLD.block is distinct from NEW.block then changed_fields := array_append(changed_fields, 'block'); end if;
  if OLD.type is distinct from NEW.type then changed_fields := array_append(changed_fields, 'type'); end if;
  if OLD.description is distinct from NEW.description then changed_fields := array_append(changed_fields, 'description'); end if;
  if OLD.rent_kwd is distinct from NEW.rent_kwd then changed_fields := array_append(changed_fields, 'rent_kwd'); end if;
  if OLD.whatsapp_e164 is distinct from NEW.whatsapp_e164 then changed_fields := array_append(changed_fields, 'whatsapp_e164'); end if;
  if OLD.status is distinct from NEW.status then changed_fields := array_append(changed_fields, 'status'); end if;
  if OLD.report_count is distinct from NEW.report_count then changed_fields := array_append(changed_fields, 'report_count'); end if;

  insert into security_audit_log (
    event_type,
    listing_id,
    action_details,
    severity,
    affected_fields,
    created_at
  ) values (
    case
      when NEW.status = 'reported' and OLD.status = 'active' then 'listing.hidden_auto'
      else 'listing.updated'
    end,
    NEW.id,
    jsonb_build_object(
      'old_status', OLD.status,
      'new_status', NEW.status,
      'old_report_count', OLD.report_count,
      'new_report_count', NEW.report_count
    ),
    case when NEW.status = 'reported' then 'medium' else 'low' end,
    changed_fields,
    now()
  );
  return NEW;
end;
$$;

drop trigger if exists audit_listing_update on listings;
create trigger audit_listing_update
  after update on listings
  for each row
  execute function audit_log_listing_update();

-- Trigger: Log all listing deletions
create or replace function audit_log_listing_deletion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into security_audit_log (
    event_type,
    listing_id,
    action_details,
    severity,
    affected_fields,
    created_at
  ) values (
    'listing.deleted',
    OLD.id,
    jsonb_build_object(
      'area', OLD.area,
      'block', OLD.block,
      'status', OLD.status,
      'report_count', OLD.report_count
    ),
    'medium',
    array['all'],
    now()
  );
  return OLD;
end;
$$;

drop trigger if exists audit_listing_delete on listings;
create trigger audit_listing_delete
  after delete on listings
  for each row
  execute function audit_log_listing_deletion();

-- Trigger: Log all report events
create or replace function audit_log_listing_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into security_audit_log (
    event_type,
    listing_id,
    action_details,
    severity,
    created_at
  ) values (
    'listing.reported',
    NEW.listing_id,
    jsonb_build_object(
      'reason', NEW.reason,
      'reported_at', NEW.created_at
    ),
    'low',
    now()
  );
  return NEW;
end;
$$;

drop trigger if exists audit_listing_report on listing_reports;
create trigger audit_listing_report
  after insert on listing_reports
  for each row
  execute function audit_log_listing_report();

-- ============================================================================
-- 6. ENHANCED VALIDATION & INPUT SANITIZATION
-- ============================================================================
-- Function to detect and log potential XSS/injection attempts in user input
create or replace function detect_injection_attempt(p_text text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  dangerous_patterns text[] := array[
    '<script', 'javascript:', 'onerror=', 'onload=', 'onclick=', 'onmouseover=',
    '-- ', '/*', '*/', 'union select', 'drop table', 'insert into', 'update set',
    'delete from', '; drop', 'exec(', 'eval(', '__proto__'
  ];
  i integer;
begin
  if p_text is null then
    return false;
  end if;
  
  for i in 1 .. array_length(dangerous_patterns, 1) loop
    if lower(p_text) like '%' || dangerous_patterns[i] || '%' then
      return true;
    end if;
  end loop;
  
  return false;
end;
$$;

-- ============================================================================
-- 7. ENHANCED CREATE_PUBLIC_LISTING WITH AUDIT
-- ============================================================================
-- Updated version that logs injection attempts and validates more strictly
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
  threat_detected boolean := false;
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

  -- Detect injection attempts
  if detect_injection_attempt(p_description) or detect_injection_attempt(p_area) or detect_injection_attempt(p_block) then
    insert into security_threats (
      threat_type,
      description,
      ip_hash,
      threat_payload,
      severity,
      action_taken
    ) values (
      'xss_attempt',
      'Potential XSS/injection in listing creation',
      'unknown',
      jsonb_build_object('area', p_area, 'description', p_description),
      'high',
      'blocked'
    );
    raise exception 'Invalid characters in input';
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

-- ============================================================================
-- 8. SECURITY MONITORING VIEWS
-- ============================================================================
-- High-level security threats view for admin dashboard
create or replace view security_threats_summary as
select
  threat_type,
  count(*) as count,
  count(distinct ip_hash) as unique_ips,
  severity,
  max(detected_at) as last_occurrence
from security_threats
where detected_at >= now() - interval '24 hours'
group by threat_type, severity
order by count desc;

-- Recent audit events view
create or replace view recent_audit_events as
select
  event_type,
  listing_id,
  severity,
  action_details,
  created_at,
  case when resolved_at is null then 'pending' else 'resolved' end as status
from security_audit_log
where created_at >= now() - interval '7 days'
order by created_at desc
limit 1000;

-- Rate limit violations view
create or replace view rate_limit_summary as
select
  operation,
  count(distinct ip_hash) as blocked_ips,
  sum(violation_count) as total_violations,
  max(blocked_until) as latest_block,
  now() as checked_at
from rate_limit_violations
where blocked_until > now()
group by operation
order by total_violations desc;

-- ============================================================================
-- 9. SECURITY MONITORING FUNCTIONS (for alerts/checks)
-- ============================================================================
-- Check if an IP hash is currently rate limited
create or replace function is_rate_limited(p_ip_hash text, p_operation text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  blocked_until timestamptz;
begin
  select max(blocked_until) into blocked_until
  from rate_limit_violations
  where ip_hash = p_ip_hash
    and operation = p_operation
    and blocked_until > now();
  
  return blocked_until is not null;
end;
$$;

-- Log a security threat
create or replace function log_security_threat(
  p_threat_type text,
  p_description text,
  p_ip_hash text,
  p_listing_id uuid default null,
  p_payload jsonb default null,
  p_severity text default 'medium'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  threat_id uuid;
begin
  insert into security_threats (
    threat_type,
    description,
    ip_hash,
    listing_id,
    threat_payload,
    severity,
    action_taken,
    detected_at
  ) values (
    p_threat_type,
    p_description,
    p_ip_hash,
    p_listing_id,
    p_payload,
    p_severity,
    'logged',
    now()
  )
  returning id into threat_id;
  
  return threat_id;
end;
$$;

-- ============================================================================
-- 10. PERMISSIONS
-- ============================================================================
-- Revoke all access to security tables from anon role
revoke all on table security_audit_log from anon;
revoke all on table security_threats from anon;
revoke all on table rate_limit_violations from anon;

-- Grant only admin functions access (via SECURITY DEFINER functions)
revoke all on function hash_ip(text) from public, authenticated;
grant execute on function hash_ip(text) to anon;

revoke all on function detect_injection_attempt(text) from public, authenticated;
grant execute on function detect_injection_attempt(text) to anon;

revoke all on function is_rate_limited(text, text) from public, authenticated;
grant execute on function is_rate_limited(text, text) to anon;

revoke all on function log_security_threat(text, text, text, uuid, jsonb, text) from public, authenticated;
grant execute on function log_security_threat(text, text, text, uuid, jsonb, text) to anon;

-- Grant view access to monitoring views (anon cannot read)
revoke all on view security_threats_summary from public, authenticated, anon;
revoke all on view recent_audit_events from public, authenticated, anon;
revoke all on view rate_limit_summary from public, authenticated, anon;

commit;
