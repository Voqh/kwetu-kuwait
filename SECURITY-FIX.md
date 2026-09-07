# Supabase Security Fix: Admin Schema Migration

## Issue Found
Supabase Advisor flagged 2 **CRITICAL SECURITY** issues:
- `public.moderation_queue` exposed to public role
- `public.report_summary` exposed to public role

These views contain sensitive data:
- **moderation_queue**: All reported/hidden listings (admin-only info)
- **report_summary**: Report patterns including user phone numbers (PII)

## What Was Fixed

### 1. Created Migration File
**File**: `migrations/20260907_007_fix_view_security.sql`

This migration:
- Creates new `admin` schema for sensitive views
- Moves `moderation_queue` from public → admin
- Moves `report_summary` from public → admin
- Revokes all access from public/authenticated/anon roles on admin schema
- Drops old public views

### 2. Updated Netlify Functions
Both functions now query the admin schema (with service role key):

**netlify/functions/moderation.js**:
```javascript
.schema("admin")
.from("moderation_queue")
```

**netlify/functions/export-reports.js**:
```javascript
.schema("admin")
.from("report_summary")
```

## How to Apply the Fix

### Option 1: Apply via Supabase Dashboard (Recommended)
1. Go to Supabase Dashboard → SQL Editor
2. Copy entire contents of `migrations/20260907_007_fix_view_security.sql`
3. Run the SQL
4. Refresh Supabase Advisor - both issues should be resolved

### Option 2: Apply via Supabase CLI
```bash
supabase db push
```
This will detect and apply the new migration automatically.

### Option 3: Manual SQL
Run each section separately in Supabase SQL Editor:

**Step 1: Create admin schema**
```sql
create schema if not exists admin;
```

**Step 2: Recreate moderation_queue in admin schema**
```sql
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
```

**Step 3: Recreate report_summary in admin schema**
```sql
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
```

**Step 4: Revoke public access**
```sql
revoke all on schema admin from public, authenticated, anon;
```

**Step 5: Drop old public views**
```sql
drop view if exists public.moderation_queue cascade;
drop view if exists public.report_summary cascade;
```

## Verification

After applying the migration:

1. **Check Supabase Advisor again**
   - The 2 critical security issues should disappear
   - Go to Dashboard → Advisors → Security

2. **Test admin functions still work**
   - Moderation function should still list reported listings
   - Export function should still generate reports CSV
   - They now query admin schema instead of public

3. **Verify public cannot access**
   - Try querying `select * from public.moderation_queue` - should fail
   - Try querying `select * from admin.moderation_queue` with anon key - should fail
   - Both succeed with service role key only ✓

## Code Changes Made

| File | Change | Reason |
|------|--------|--------|
| `migrations/20260907_007_fix_view_security.sql` | NEW | Migration to move views to admin schema |
| `netlify/functions/moderation.js` | Updated | Query admin schema instead of public |
| `netlify/functions/export-reports.js` | Updated | Query admin schema instead of public |

## Security Impact

**Before**: 
- Anyone with anon key could query sensitive moderation data
- Reports included user phone numbers (PII exposure)
- Compliance risk if users discovered data was accessible

**After**:
- Only service role key can access admin schema
- Netlify functions use service role key (environment variable, not exposed)
- Public/authenticated roles cannot bypass restrictions
- Full compliance with least privilege principle

## Deployment Checklist

- [ ] Apply migration to Supabase
- [ ] Test moderation.js function with ADMIN_SECRET header
- [ ] Test export-reports.js function with ADMIN_SECRET header
- [ ] Verify Supabase Advisor shows 0 critical security issues
- [ ] Commit changes to git
- [ ] Deploy Netlify functions

