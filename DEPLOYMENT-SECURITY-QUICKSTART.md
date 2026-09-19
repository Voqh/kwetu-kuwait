# Quick-Start: Security Deployment Guide
**Version**: 1.0  
**Time Required**: 30-45 minutes  
**Target**: Production Supabase Project

---

## STEP 1: Backup Current Database (5 min)

### Via Supabase Dashboard
1. Go to: https://app.supabase.com
2. Select your Kwetu Kuwait project
3. Navigate to: **Database** → **Backups**
4. Click: **Create a backup**
5. Wait for backup to complete (~1 min)

**Verification**: Backup appears in backup list with timestamp

✅ **Status**: Backup created

---

## STEP 2: Deploy Security Migration (5 min)

### Option A: Via Supabase Dashboard (Easiest)

1. Go to: https://app.supabase.com
2. Select your project
3. Navigate to: **Database** → **SQL Editor**
4. Click: **New Query**
5. Copy entire contents of: `migrations/20260919_009_comprehensive_security_enhancements.sql`
6. Paste into editor
7. Click: **Run** button
8. Wait for success message (~30 seconds)

**Success Indicator**: Green checkmark, no errors in output

✅ **Status**: Migration executed

### Option B: Via Supabase CLI

```bash
cd ~/Site_project/kwetu-kuwait

# Ensure you're logged in
supabase login

# Link project (one-time)
supabase link --project-ref <YOUR_PROJECT_REF>

# Push migration
supabase db push
```

### Option C: Via psql directly

```bash
# Load .env
export $(cat .env | grep -v '^#' | xargs)

# Run migration
psql "$SUPABASE_DATABASE_URL" < migrations/20260919_009_comprehensive_security_enhancements.sql
```

---

## STEP 3: Verify Database Objects (5 min)

### In Supabase SQL Editor, run each query:

**A. Check Tables Exist**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('security_audit_log', 'security_threats', 'rate_limit_violations')
ORDER BY table_name;
```
**Expected**: 3 rows ✅

**B. Check Functions Exist**
```sql
SELECT proname 
FROM pg_proc 
WHERE proname IN ('hash_ip', 'detect_injection_attempt', 'is_rate_limited', 'log_security_threat')
ORDER BY proname;
```
**Expected**: 4 rows ✅

**C. Check Triggers Exist**
```sql
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name LIKE 'audit%'
ORDER BY trigger_name;
```
**Expected**: 4 rows ✅

**D. Check Views Exist**
```sql
SELECT viewname 
FROM pg_views 
WHERE schemaname = 'public' 
AND (viewname LIKE 'security%' OR viewname LIKE 'rate_limit%')
ORDER BY viewname;
```
**Expected**: 3 rows ✅

✅ **Status**: All objects verified

---

## STEP 4: Test Admin Dashboard (5 min)

### Step 4.1: Open Admin Page
```
URL: https://kwetukuwait.com/admin.html
     OR http://localhost:3000/admin.html (if testing locally)
```

### Step 4.2: Verify Auth Required
- You should see: **"Authenticate to access admin tools"**
- Moderation queue should be hidden

✅ **Status**: Auth gate working

### Step 4.3: Test Authentication
1. Enter your **admin secret** in the password field
2. Click: **Authenticate**
3. Verify: 
   - Status shows "✓ Authenticated"
   - Moderation Queue becomes visible
   - Session info displays start time

✅ **Status**: Admin auth working

---

## STEP 5: Create Test Listing & Verify Audit (5 min)

### Step 5.1: Post Test Listing
1. Go to: https://kwetukuwait.com (main page)
2. Click: **"Post a room"** button
3. Fill form:
   - **Area**: Salmiya
   - **Block**: 1
   - **Type**: Room
   - **Description**: Security test listing — audit logging
   - **Price**: 99 KWD
   - **WhatsApp**: +965XXXXXXXX (your test number)
4. Click: **"Post"**
5. Note the listing ID (shown in success message or URL)

✅ **Status**: Test listing created

### Step 5.2: Verify Audit Log Entry
In Supabase SQL Editor, run:
```sql
SELECT 
  event_type,
  listing_id,
  action_details->>'area' as area,
  severity,
  created_at
FROM security_audit_log
WHERE event_type = 'listing.created'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected**: Row showing:
- event_type: `listing.created`
- area: `Salmiya`
- severity: `low`

✅ **Status**: Audit logging working

---

## STEP 6: Test Report Blocking (5 min)

### Step 6.1: Report Listing 3 Times
1. Go back to home page
2. Find your test listing
3. Click: **"Report"** button
4. Select reason: "Spam or abuse"
5. **Repeat 2 more times** (total 3 reports)

### Step 6.2: Verify Auto-Hide
1. Refresh the page
2. Your test listing should **disappear** from the board
3. In SQL Editor, verify:
```sql
SELECT id, status, report_count
FROM listings
WHERE description LIKE '%Security test listing%';
```

**Expected**: 
- status: `reported`
- report_count: `3`

✅ **Status**: Report blocking working

---

## STEP 7: Set Up Monitoring (Optional, 5 min)

### Quick Monitoring Setup
```bash
cd ~/Site_project/kwetu-kuwait

# Create monitoring scripts
bash scripts/setup-security-monitoring.sh

# Test daily check script
bash scripts/security-check-daily.sh
```

**Expected**: Security report printed with threats, blocked IPs, etc.

### Add to Crontab (Optional)
```bash
crontab -e

# Add these lines:
0 9 * * * cd ~/Site_project/kwetu-kuwait && bash scripts/security-check-daily.sh
0 14 * * 5 cd ~/Site_project/kwetu-kuwait && bash scripts/security-audit-weekly.sh
```

✅ **Status**: Monitoring setup complete (optional)

---

## STEP 8: Document Deployment

### Update DEPLOYMENT.md
Add to the file:
```markdown
## Security Enhancements (2026-09-19)

**Migration**: 20260919_009_comprehensive_security_enhancements.sql  
**Date Deployed**: 2026-09-19  
**Status**: ✅ Deployed and tested

### Changes
- Added: security_audit_log table (comprehensive event logging)
- Added: security_threats table (threat detection and tracking)
- Added: rate_limit_violations table (rate limit monitoring)
- Enhanced: admin.html (session timeout, XSS prevention)
- Added: Monitoring scripts (daily/weekly security checks)

### Testing
- ✅ All database objects verified
- ✅ Admin auth working
- ✅ Audit logging verified
- ✅ Report blocking verified
```

✅ **Status**: Documentation updated

---

## STEP 9: Commit Changes

```bash
cd ~/Site_project/kwetu-kuwait

# Stage all changes
git add -A

# Commit
git commit -m "deployment: Security migration deployed to production (2026-09-19)"

# Push
git push origin main
```

✅ **Status**: Changes committed to git

---

## Deployment Complete! ✅

### What's Now Active
- ✅ Comprehensive audit logging (all operations tracked)
- ✅ Security threat detection (XSS, injection attempts)
- ✅ Rate limit monitoring (abuse prevention)
- ✅ Admin dashboard security (session timeout, XSS prevention)
- ✅ Monitoring views (admin dashboard access)

### Next Actions

1. **Daily** (9 AM UTC):
   - Run: `bash scripts/security-check-daily.sh`
   - Review threat summary

2. **Weekly** (Friday 2 PM UTC):
   - Run: `bash scripts/security-audit-weekly.sh`
   - Review patterns and anomalies

3. **Monthly**:
   - Full security audit (see SECURITY-OPERATIONS.md)
   - Review admin access logs

4. **Quarterly**:
   - Penetration testing
   - Dependency updates
   - Full compliance review

---

## Troubleshooting

### Issue: Migration fails with "table already exists"
**Solution**: Migration uses `CREATE TABLE IF NOT EXISTS`, so it's safe to re-run

### Issue: Admin auth not working
**Solution**: 
1. Verify admin secret is ≥16 characters
2. Check environment variables
3. Clear browser localStorage and try again

### Issue: Audit events not showing up
**Solution**:
1. Verify triggers created: `SELECT trigger_name FROM information_schema.triggers...`
2. Check Supabase logs for errors
3. Re-run migration if needed

### Issue: RLS policy errors
**Solution**:
1. Verify policies created
2. Check policy conditions
3. Re-run migration

---

## Reference Documents

- **[SECURITY-HARDENING.md](SECURITY-HARDENING.md)** — Full security design (855 lines)
- **[SECURITY-OPERATIONS.md](SECURITY-OPERATIONS.md)** — Operations manual (522 lines)
- **[SECURITY-TESTING-CHECKLIST.md](SECURITY-TESTING-CHECKLIST.md)** — Detailed testing procedures
- **[SECURITY-IMPLEMENTATION-SUMMARY.md](SECURITY-IMPLEMENTATION-SUMMARY.md)** — Implementation details

---

## Support

For issues or questions:
1. Check logs in Supabase dashboard (Database → Logs)
2. Review SECURITY-OPERATIONS.md → Incident Response
3. Consult SECURITY-TESTING-CHECKLIST.md for verification steps

---

**Deployment Date**: 2026-09-19  
**Deployed By**: [Your Name]  
**Status**: ✅ Complete
