# Security Implementation Testing Checklist
**Date**: 2026-09-19  
**Purpose**: Verify all security enhancements are working correctly  
**Duration**: ~2-3 hours

---

## PRE-TESTING SETUP

### Prepare Test Environment
- [ ] Migration deployed to Supabase
- [ ] Admin credentials ready
- [ ] Access to Supabase SQL Editor
- [ ] Test user with WhatsApp number ready
- [ ] Browser console open (F12) for debugging
- [ ] Supabase logs accessible

---

## SECTION 1: Database Migration Verification (15 min)

### 1.1 Verify Tables Exist
**Command**: Run in Supabase SQL Editor
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('security_audit_log', 'security_threats', 'rate_limit_violations')
ORDER BY table_name;
```

**Expected Result**: 3 rows (security_audit_log, security_threats, rate_limit_violations)

- [ ] ✅ All 3 tables exist
- [ ] ⏰ If missing, re-run migration

### 1.2 Verify Functions Exist
**Command**:
```sql
SELECT proname 
FROM pg_proc 
WHERE proname IN ('hash_ip', 'detect_injection_attempt', 'is_rate_limited', 'log_security_threat')
ORDER BY proname;
```

**Expected Result**: 4 rows (functions listed)

- [ ] ✅ All 4 functions exist
- [ ] ⏰ If missing, re-run migration

### 1.3 Verify Triggers Exist
**Command**:
```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name LIKE 'audit%'
ORDER BY trigger_name;
```

**Expected Result**: 4 rows (audit_listing_create, update, delete, report)

- [ ] ✅ All 4 triggers exist
- [ ] ⏰ If missing, re-run migration

### 1.4 Verify Views Exist
**Command**:
```sql
SELECT viewname 
FROM pg_views 
WHERE schemaname = 'public' 
AND (viewname LIKE 'security%' OR viewname LIKE 'rate_limit%')
ORDER BY viewname;
```

**Expected Result**: 3 rows (security_threats_summary, recent_audit_events, rate_limit_summary)

- [ ] ✅ All 3 views exist
- [ ] ⏰ If missing, re-run migration

### 1.5 Verify RLS Policies
**Command**:
```sql
SELECT policyname, tablename
FROM pg_policies
WHERE schemaname = 'public'
AND (tablename IN ('security_audit_log', 'security_threats', 'rate_limit_violations'))
ORDER BY tablename, policyname;
```

**Expected Result**: RLS policies preventing anon read access

- [ ] ✅ RLS policies in place

---

## SECTION 2: Admin Dashboard Security (30 min)

### 2.1 Test Authentication
**Steps**:
1. Open: `https://kwetukuwait.com/admin.html` (or local dev server)
2. Verify message: "Authenticate to access admin tools"
3. Click: "Authenticate" button without entering secret
4. Verify: Error message "Enter admin secret"

- [ ] ✅ Auth form works
- [ ] ✅ Validation working (requires input)

### 2.2 Test With Invalid Secret
**Steps**:
1. Enter: "wrongsecret" in admin secret field
2. Click: "Authenticate"
3. Verify: Error message "✗ Auth failed. Invalid secret."

- [ ] ✅ Invalid secret rejected

### 2.3 Test With Valid Secret
**Steps**:
1. Enter: Your admin secret
2. Click: "Authenticate"
3. Verify: 
   - Message: "✓ Authenticated"
   - Moderation Queue visible
   - Session info shows start time and 30-min expiry

- [ ] ✅ Valid secret accepted
- [ ] ✅ Moderation queue loads
- [ ] ✅ Session info displays

### 2.4 Test 30-Minute Session Timeout
**Steps**:
1. Authenticate (note the time)
2. Wait 31 minutes
3. Refresh page
4. Verify: 
   - Session expired message OR
   - Prompt to re-authenticate

**OR** (quicker test):
- Modify `SESSION_TIMEOUT_MS` in browser console to 60000 (1 min) for testing
- Wait 61 seconds
- Verify auto-logout

- [ ] ✅ Session timeout works
- [ ] ✅ Auto-logout on expiry

### 2.5 Test XSS Prevention in Moderation Queue
**Steps**:
1. Create listing with XSS payload in description:
   ```
   Test <script>alert('XSS')</script> payload
   ```
2. Report listing 3 times
3. Go to admin dashboard
4. View moderation queue
5. Verify: Script tags displayed as `&lt;script&gt;` (escaped, no alert)

- [ ] ✅ XSS payload escaped
- [ ] ✅ No alert popup executed

### 2.6 Test Moderation Actions
**Steps**:
1. Find reported listing in queue
2. Click: "Reinstate" button
3. Confirm dialog
4. Verify: Listing status changes to active

OR

1. Find reported listing
2. Click: "Delete" button  
3. Confirm dialog
4. Verify: Listing removed from queue

- [ ] ✅ Reinstate works
- [ ] ✅ Delete works

---

## SECTION 3: Audit Logging (30 min)

### 3.1 Test Listing Creation Logging
**Steps**:
1. Create test listing:
   - Area: Salmiya
   - Block: 1
   - Type: Room
   - Description: Security test listing (TEST-001)
   - Price: 99 KWD
   - WhatsApp: +965XXXXXXXX
2. Note listing ID
3. In Supabase SQL Editor, run:
```sql
SELECT event_type, listing_id, action_details, severity, created_at
FROM security_audit_log
WHERE event_type = 'listing.created'
AND action_details->>'area' = 'Salmiya'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Result**: Row showing listing.created event with area=Salmiya

- [ ] ✅ Creation logged
- [ ] ✅ Event type correct
- [ ] ✅ Area captured

### 3.2 Test Report Logging
**Steps**:
1. Find test listing on board
2. Click "Report" button 3 times with reasons:
   - First: "spam"
   - Second: "fake listing"
   - Third: "no response"
3. Run in SQL:
```sql
SELECT COUNT(*) as report_count
FROM listing_reports
WHERE listing_id = 'YOUR_LISTING_ID_HERE'
AND created_at >= NOW() - INTERVAL '5 minutes';

SELECT event_type, COUNT(*) as count
FROM security_audit_log
WHERE listing_id = 'YOUR_LISTING_ID_HERE'
AND event_type = 'listing.reported'
GROUP BY event_type;
```

**Expected Result**: 
- 3 rows in listing_reports
- 3 rows in audit_log with listing.reported

- [ ] ✅ Reports logged (3 entries)
- [ ] ✅ Audit events logged (3 entries)

### 3.3 Test Auto-Hide on 3 Reports
**Steps**:
1. After 3 reports (from 3.2), listing should disappear from public board
2. Run in SQL:
```sql
SELECT id, status, report_count, expires_at
FROM listings
WHERE id = 'YOUR_LISTING_ID_HERE';
```

**Expected Result**: status='reported', report_count=3

- [ ] ✅ Listing hidden (status=reported)
- [ ] ✅ Report count = 3

### 3.4 Test Listing Update Logging
**Steps**:
1. Create a test listing (if you have edit token)
2. Edit description: "Updated test description"
3. Run in SQL:
```sql
SELECT event_type, action_details, affected_fields, created_at
FROM security_audit_log
WHERE event_type = 'listing.updated'
AND listing_id = 'YOUR_LISTING_ID_HERE'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Result**: Event shows which fields changed (description, etc.)

- [ ] ✅ Update logged
- [ ] ✅ Changed fields listed

### 3.5 Test Listing Deletion Logging
**Steps**:
1. Using edit token, delete test listing via RPC
2. Run in SQL:
```sql
SELECT event_type, action_details, created_at
FROM security_audit_log
WHERE event_type = 'listing.deleted'
AND created_at >= NOW() - INTERVAL '5 minutes'
LIMIT 1;
```

**Expected Result**: deletion event logged

- [ ] ✅ Deletion logged
- [ ] ✅ Listing ID captured

---

## SECTION 4: Security Threat Detection (20 min)

### 4.1 Test XSS Injection Detection
**Steps**:
1. Try to create listing with XSS payload:
   ```
   <script>alert(1)</script>
   ```
2. In description or area field
3. Verify: RPC returns error (rejected by detect_injection_attempt)

**SQL to check**:
```sql
SELECT threat_type, description, threat_payload, severity
FROM security_threats
WHERE threat_type = 'xss_attempt'
AND detected_at >= NOW() - INTERVAL '5 minutes'
ORDER BY detected_at DESC
LIMIT 1;
```

- [ ] ✅ XSS attempt blocked
- [ ] ✅ Threat logged in security_threats

### 4.2 Test SQL Injection Detection
**Steps**:
1. Try to create listing with SQL payload:
   ```
   '; DROP TABLE listings; --
   ```
2. Verify: RPC rejects with error

**SQL to check**:
```sql
SELECT threat_type, description
FROM security_threats
WHERE threat_type IN ('sql_injection_attempt', 'xss_attempt')
AND detected_at >= NOW() - INTERVAL '5 minutes'
LIMIT 1;
```

- [ ] ✅ SQL injection blocked
- [ ] ✅ Threat logged

### 4.3 Verify Threat Monitoring View
**Command**:
```sql
SELECT * FROM security_threats_summary;
```

**Expected Result**: Summary of threats with counts and severity

- [ ] ✅ View returns data
- [ ] ✅ Threat types displayed with counts

---

## SECTION 5: Rate Limiting (15 min)

### 5.1 Check Rate Limit Table Structure
**Command**:
```sql
SELECT * FROM rate_limit_violations LIMIT 1;
```

**Expected Result**: No errors, table exists

- [ ] ✅ Table accessible

### 5.2 Check Rate Limit Summary View
**Command**:
```sql
SELECT * FROM rate_limit_summary;
```

**Expected Result**: Summary of rate-limited operations

- [ ] ✅ View returns data (if any rate limits active)

### 5.3 Test is_rate_limited() Function
**Command**:
```sql
-- Test with non-existent IP (should return false)
SELECT is_rate_limited('00000000000000000', 'report');

-- Result should be: false
```

- [ ] ✅ Function executes without error

---

## SECTION 6: Monitoring Views (10 min)

### 6.1 Test recent_audit_events View
**Command**:
```sql
SELECT * FROM recent_audit_events LIMIT 5;
```

**Expected Result**: Recent audit events with timestamps and status

- [ ] ✅ View shows audit events
- [ ] ✅ Event types displayed

### 6.2 Test security_threats_summary View
**Command**:
```sql
SELECT * FROM security_threats_summary;
```

**Expected Result**: Threat statistics by type and severity

- [ ] ✅ View returns threat summary
- [ ] ✅ Counts and severity levels shown

### 6.3 Test rate_limit_summary View
**Command**:
```sql
SELECT * FROM rate_limit_summary;
```

**Expected Result**: Rate limit statistics by operation

- [ ] ✅ View returns rate limit data (if active)

---

## SECTION 7: Admin Permissions (10 min)

### 7.1 Verify Anon Cannot Read Security Tables
**Command** (run as `anon` role via Supabase anonymous key):
```sql
SELECT * FROM security_audit_log LIMIT 1;
```

**Expected Result**: Permission denied error

- [ ] ✅ Anon read blocked by RLS

### 7.2 Verify Functions Callable by Anon
**Command**:
```sql
SELECT hash_ip('+1234567890');
SELECT detect_injection_attempt('<script>test</script>');
SELECT is_rate_limited('test', 'report');
```

**Expected Result**: All functions execute successfully

- [ ] ✅ Functions callable by anon
- [ ] ✅ No permission errors

---

## SECTION 8: CSP & Security Headers (5 min)

### 8.1 Verify CSP Header in index.html
**Steps**:
1. Open: https://kwetukuwait.com
2. Right-click → Inspect → Network tab
3. Refresh page
4. Click on first (document) request
5. Check Headers → Content-Security-Policy

**Expected Result**: CSP header present with:
- default-src 'self'
- script-src includes trusted sources
- frame-ancestors 'none'

- [ ] ✅ CSP header present
- [ ] ✅ Restrictive defaults

### 8.2 Verify Admin Dashboard CSP
**Steps**:
1. Open: https://kwetukuwait.com/admin.html
2. Check response headers → CSP present
3. Verify: Matches expected policy

- [ ] ✅ Admin CSP different/restrictive

---

## SECTION 9: Integration Tests (30 min)

### 9.1 Complete Workflow: Create → Report → Hide
**Steps**:
1. Create test listing (note ID and name)
2. Report 3 times
3. Verify hidden from public board
4. Go to admin dashboard
5. Find in moderation queue
6. Click "Reinstate"
7. Verify visible on public board again

**Audit Trail Check**:
```sql
SELECT event_type, COUNT(*) as count
FROM security_audit_log
WHERE listing_id = 'YOUR_LISTING_ID_HERE'
ORDER BY created_at;
```

**Expected Results**:
- listing.created (1)
- listing.reported (3)
- listing.hidden_auto (1)
- moderation.reinstate_listing (1)

- [ ] ✅ All events logged
- [ ] ✅ Listing transitions correct

### 9.2 Complete Workflow: Create → Edit → Update
**Steps**:
1. Create test listing
2. Edit description
3. Check audit log

**Expected**:
- listing.created
- listing.updated (with affected_fields=['description'])

- [ ] ✅ Both events logged

---

## SECTION 10: Documentation Review (15 min)

### 10.1 Verify Documentation Files Exist
- [ ] ✅ SECURITY-HARDENING.md (exists and readable)
- [ ] ✅ SECURITY-OPERATIONS.md (exists and readable)
- [ ] ✅ SECURITY-IMPLEMENTATION-SUMMARY.md (exists and readable)

### 10.2 Verify Deployment Guide
- [ ] ✅ Deployment steps clear
- [ ] ✅ Testing procedures documented
- [ ] ✅ Monitoring setup explained

### 10.3 Verify Operations Manual
- [ ] ✅ Daily checks documented
- [ ] ✅ Incident response playbooks present
- [ ] ✅ Admin procedures clear

---

## FINAL SUMMARY

### Test Results
- Total Checks: 60
- Passed: _____ 
- Failed: _____
- Incomplete: _____

### Overall Status
- [ ] ✅ All tests passed — Ready for production
- [ ] ⚠️  Some tests failed — Review failures and fix
- [ ] ❌ Critical failures — Do not deploy

### Sign-Off
- Tester: ________________
- Date: ________________
- Notes: ________________

---

## Remediation (if needed)

### If tests failed:
1. Document failure details
2. Check error logs
3. Review migration SQL syntax
4. Re-run migration if necessary
5. Re-test failed items
6. Document resolution

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Tables not found | Re-run migration; check for SQL errors |
| Functions not found | Verify migration completed; check function names |
| RLS policy error | Verify policies created; check policy names |
| Admin auth fails | Check secret length (≥16 chars); verify environment variables |
| XSS not blocked | Check detect_injection_attempt() function logic |
| Audit events not logged | Verify triggers created; check trigger conditions |

---

**Test Date**: _______________  
**Tester Name**: _______________  
**Status**: _______________  
**Sign-Off**: _______________
