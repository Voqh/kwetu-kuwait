# Kwetu Kuwait — Security Operations Manual
**Version**: 1.0  
**Last Updated**: 2026-09-19  
**Audience**: Developers, DevOps, Moderators

---

## Table of Contents
1. [Daily Security Checks](#daily-checks)
2. [Incident Response](#incident-response)
3. [Admin Operations](#admin-operations)
4. [Monitoring & Alerts](#monitoring-alerts)
5. [Backup & Recovery](#backup-recovery)
6. [Regular Audits](#audits)

---

## Daily Security Checks

### 1. Threat Summary (5 minutes)
```sql
-- Supabase Dashboard → SQL Editor → Run this query:
SELECT 
  threat_type,
  COUNT(*) as count,
  MAX(severity) as max_severity,
  MAX(detected_at) as last_occurrence
FROM security_threats
WHERE detected_at >= NOW() - INTERVAL '24 hours'
GROUP BY threat_type
ORDER BY count DESC;
```

**Action if**: 
- Any **critical** threats → Investigate immediately
- 20+ threats in 24h → Review pattern in security_threats table
- Same IP hash with 5+ threats → Consider blocking (see Rate Limiting)

### 2. Audit Log Review (5 minutes)
```sql
-- Check for suspicious admin activity
SELECT 
  event_type,
  COUNT(*) as count,
  severity
FROM security_audit_log
WHERE event_type LIKE 'admin.%'
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY event_type, severity
ORDER BY severity DESC;
```

**Action if**:
- Any admin actions NOT performed by actual admins → Investigate
- Listing.hidden_auto > 20 in 24h → False positives? Review reports

### 3. Rate Limit Status (3 minutes)
```sql
-- Check who is currently blocked
SELECT 
  operation,
  COUNT(DISTINCT ip_hash) as blocked_ips,
  SUM(violation_count) as total_violations,
  MIN(blocked_until) as first_unblock,
  MAX(blocked_until) as last_unblock
FROM rate_limit_violations
WHERE blocked_until > NOW()
GROUP BY operation;
```

**Action if**:
- **20+ blocked IPs** → DDoS/abuse attack in progress
- Same IP across multiple operations → Sophisticated attacker
- Spike in 'report' operation blocks → Potential report spam ring

### 4. Listing Health Check (5 minutes)
```sql
-- Verify data integrity
SELECT 
  COUNT(*) as total_active,
  COUNT(CASE WHEN whatsapp_e164 IS NULL THEN 1 END) as no_contact,
  COUNT(CASE WHEN report_count >= 3 THEN 1 END) as at_threshold,
  COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_not_purged
FROM listings
WHERE status = 'active';
```

**Action if**:
- **expired_not_purged > 0** → Purge job failed; run manually:
  ```sql
  SELECT purge_expired_listings();
  ```
- **no_contact > expected** → Scrub job failing (check function logs)
- **at_threshold > 100** → Many marginal listings; review reports for false positives

---

## Incident Response

### Scenario 1: Potential XSS Attack Detected
```
Symptoms: XSS injection attempt in security_threats view
Timeline:
  1. Alert from security_threats_summary
  2. Review threat_payload JSONB
  3. Identify affected listings
  4. Assess if injection was successful
```

**Response Steps**:
```sql
-- Step 1: Find the attack
SELECT * FROM security_threats
WHERE threat_type = 'xss_attempt'
  AND detected_at >= NOW() - INTERVAL '1 hour'
ORDER BY detected_at DESC;

-- Step 2: Check if any listings were created with malicious content
SELECT id, area, description, created_at
FROM listings
WHERE description LIKE '%<script%'
  OR description LIKE '%javascript:%'
  OR description LIKE '%onerror=%';

-- Step 3: If found, automatically hide and audit
UPDATE listings
SET status = 'reported'
WHERE id IN (...)  -- IDs from Step 2
RETURNING id, area, created_at;

-- Step 4: Log the incident
INSERT INTO security_audit_log (
  event_type,
  action_details,
  severity,
  created_at
) VALUES (
  'security.threat_detected',
  jsonb_build_object('type', 'xss_attack_contained', 'listings_hidden', 5),
  'high',
  NOW()
);
```

### Scenario 2: Rate Limit Attack (DDoS)
```
Symptoms: 50+ IPs blocked in rate_limit_violations
Impact: Performance degradation, legitimate users blocked
```

**Response Steps**:
```sql
-- Step 1: Identify attack sources
SELECT 
  ip_hash,
  operation,
  COUNT(*) as attempts,
  MAX(violation_count) as peak_violations,
  MAX(blocked_until) as blocked_until
FROM rate_limit_violations
WHERE blocked_until > NOW()
GROUP BY ip_hash, operation
ORDER BY attempts DESC
LIMIT 10;

-- Step 2: Analyze attack pattern
SELECT 
  EXTRACT(HOUR FROM created_at) as hour,
  COUNT(*) as attack_count
FROM security_audit_log
WHERE event_type = 'rate_limit.triggered'
  AND created_at >= NOW() - INTERVAL '2 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Step 3: If DDoS confirmed, escalate to infrastructure
-- (Cloudflare, Netlify, or WAF rules)
-- Note: Nothing to do in DB; rate limiting is application-level
-- Verify no legitimate users blocked:
-- - Check if any IP has legitimate action followed by blocks
-- - Consider manual unblock: UPDATE rate_limit_violations 
--     SET resolved_at = NOW() 
--     WHERE ip_hash = '...' AND blocked_until > NOW();

-- Step 4: Log incident
INSERT INTO security_audit_log (
  event_type,
  action_details,
  severity
) VALUES (
  'security.threat_detected',
  jsonb_build_object('type', 'ddos_attack', 'blocked_ips', 45),
  'critical'
);
```

### Scenario 3: Unauthorized Admin Access Attempt
```
Symptoms: Multiple failed admin secret attempts
Impact: Potential credential stuffing/brute force
```

**Response Steps**:
```sql
-- Step 1: Check admin access log
SELECT 
  COUNT(*) as failure_count,
  COUNT(DISTINCT ip_hash) as unique_ips,
  MIN(created_at) as first_attempt,
  MAX(created_at) as last_attempt
FROM security_audit_log
WHERE event_type = 'admin.login_attempt'
  AND action_details->>'success' = 'false'
  AND created_at >= NOW() - INTERVAL '1 hour';

-- Step 2: If confirmed, rotate admin secret
-- (Update environment variables in Supabase/Netlify)

-- Step 3: Log incident
INSERT INTO security_audit_log (
  event_type,
  action_details,
  severity
) VALUES (
  'security.threat_detected',
  jsonb_build_object('type', 'brute_force_attempt', 'attempts', 15),
  'high'
);
```

### Scenario 4: Data Corruption/Loss
```
Symptoms: Unexpected mass deletion, report_count anomalies
Impact: Data integrity violation
```

**Recovery Steps**:
```
1. STOP all writes (notify Supabase support)
2. Take manual backup:
   pg_dump -Fc postgresql://...
3. Assess scope:
   SELECT COUNT(*) FROM listings; -- should match expected
4. PITR to last known good state:
   - Supabase Dashboard → Database → Backups → Restore to Point-in-Time
   - Specify time: 2 hours ago (before corruption detected)
5. Verify data integrity post-restore
6. Audit forensics:
   - Check security_audit_log for WHO/WHAT/WHEN
   - Identify root cause (bug, breach, or accident)
7. Communicate with stakeholders
8. Implement preventive measures
```

---

## Admin Operations

### Access Admin Dashboard
```
1. Go to: https://kwetukuwait.com/admin.html
2. Enter admin secret (from environment variables)
3. Browser will check session timeout (30 min)
4. View: Moderation queue, actions, export reports
```

### Moderation Queue Actions

#### Reinstate a Listing
```
1. Open admin dashboard
2. Find listing in "Moderation Queue"
3. Click "Reinstate" button
4. Confirm: "Reinstate this listing?"
5. Listing status: 'reported' → 'active'
6. Audit log: moderation.reinstate_listing event
```

#### Delete a Listing
```
1. Open admin dashboard
2. Find listing in "Moderation Queue"
3. Click "Delete" button
4. Confirm: "Permanently delete this listing?"
5. Listing and all related data deleted
6. Audit log: moderation.delete_listing event
```

#### Export Reports (CSV)
```
1. Open admin dashboard
2. Scroll to "Data Export" section
3. Click "Export Reports (CSV)"
4. File downloads: kwetu-reports-YYYY-MM-DD.csv
5. Contains: listing_id, area, phone, report_reasons, timestamps
```

### Monitoring Moderation Activity
```sql
-- See who has accessed admin dashboard
SELECT 
  created_at,
  action_details->>'admin_id' as admin,
  action_details->>'action' as action,
  listing_id
FROM security_audit_log
WHERE event_type LIKE 'admin.%'
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

---

## Monitoring & Alerts

### Set Up Email Alerts (Optional)
If using Supabase Pro or self-hosted:
```sql
-- Example: Alert if 50+ threats in 1 hour
-- (Implement via Edge Function or third-party service)

CREATE FUNCTION check_threat_threshold()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM security_threats 
      WHERE detected_at >= NOW() - INTERVAL '1 hour') >= 50 THEN
    -- Send alert (implement via external service)
    -- PERFORM notify_admin('CRITICAL: 50+ threats in last hour');
  END IF;
END;
$$;

-- Call via pg_cron every 5 minutes:
-- SELECT cron.schedule('threat-alert', '*/5 * * * *', 'SELECT check_threat_threshold()');
```

### Manual Alert Checks (Recommended)
```bash
# Add to cron job (daily at 09:00 UTC):
#!/bin/bash
THREATS=$(psql $DATABASE_URL -t -c "
  SELECT COUNT(*) FROM security_threats 
  WHERE severity = 'critical' 
  AND resolved_at IS NULL
  AND detected_at >= NOW() - INTERVAL '24 hours'
")

if [ "$THREATS" -gt 0 ]; then
  curl -X POST https://slack.com/api/chat.postMessage \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $SLACK_TOKEN" \
    -d "{\"channel\": \"#security\", \"text\": \"⚠️ $THREATS critical security threats unresolved\"}"
fi
```

---

## Backup & Recovery

### Automated Supabase Backups (Active)
- **Frequency**: Daily + on-demand
- **Retention**: 30 days (free), 90 days (Pro)
- **Access**: Supabase Dashboard → Database → Backups

### Manual Backup
```bash
# Export schema + data
pg_dump \
  --clean \
  --if-exists \
  --format=custom \
  postgresql://user:password@host:5432/postgres > kwetu-backup-$(date +%Y%m%d-%H%M%S).sql

# Compress for archival
gzip kwetu-backup-*.sql

# Store in GitHub Actions artifact or AWS S3
```

### Point-in-Time Recovery (PITR)
```
1. Detect incident/data loss
2. Supabase Dashboard → Database → Backups
3. Click "Restore" on nearest backup
4. Select: "Restore to point in time"
5. Choose timestamp: 2 hours before incident
6. Confirm: "Restore database to [time]"
7. Wait 5-10 minutes for restore
8. Verify data post-restore
9. Document incident
```

### Disaster Recovery Drill (Quarterly)
```
1. Take fresh backup
2. Restore to staging database
3. Verify all data present
4. Test all RPC functions
5. Run full test suite
6. Document any issues
7. Update DEPLOYMENT.md with learnings
```

---

## Regular Audits

### Weekly Audit (Friday)
```sql
-- Comprehensive security review
SELECT 
  'Threats' as audit_category,
  COUNT(*) as count,
  'unresolved: ' || COUNT(CASE WHEN resolved_at IS NULL THEN 1 END) as status
FROM security_threats
UNION ALL
SELECT 
  'Rate Limit Violations',
  COUNT(*),
  'active: ' || COUNT(CASE WHEN blocked_until > NOW() THEN 1 END)
FROM rate_limit_violations
UNION ALL
SELECT 
  'Audit Events (24h)',
  COUNT(*),
  'critical: ' || COUNT(CASE WHEN severity = 'critical' THEN 1 END)
FROM security_audit_log
WHERE created_at >= NOW() - INTERVAL '24 hours';
```

### Monthly Audit (First Friday)
```
1. Review security_audit_log (30 days)
2. Identify patterns (high-risk areas, repeat offenders)
3. Review all resolved_at = NULL threats
4. Check admin access logs
5. Verify backup integrity
6. Update SECURITY-HARDENING.md with new findings
7. Prepare incident summary report
```

### Quarterly Audit (Every 3 months)
```
1. Full penetration testing (self or external)
2. Code review of security-critical paths
3. Dependency audit (npm audit, supply chain checks)
4. Database schema review (unused columns, missing constraints)
5. Test disaster recovery procedures
6. Review and rotate admin secrets
7. Update security roadmap
8. Prepare board report
```

---

## Security Checklist

### Pre-Deployment
- [ ] All security_audit_log tables enabled and monitored
- [ ] Rate limiting thresholds validated
- [ ] Admin auth working (secret prompt, timeout)
- [ ] CSP headers present
- [ ] No hardcoded secrets in code
- [ ] All user inputs escaped (escapeHtml verification)
- [ ] Backup tested and verified
- [ ] Deployment notification sent

### Post-Deployment
- [ ] Verify threats/audit views accessible
- [ ] Spot-check moderation queue
- [ ] Confirm rate limiting working (test with invalid token)
- [ ] Admin access confirmed working
- [ ] Monitoring alerts configured
- [ ] Team notified of changes

### Weekly
- [ ] Review threat summary
- [ ] Check audit log for anomalies
- [ ] Verify rate limit health
- [ ] Confirm backups running

### Monthly
- [ ] Full audit (see Monthly Audit section)
- [ ] Admin secret rotation (if needed)
- [ ] Update documentation

---

## Contact & Escalation

### Security Incident
1. **Immediate**: Stop the attack (rate limit, block IP, isolate DB)
2. **Notify**: Alert security team lead
3. **Assess**: Scope, impact, root cause
4. **Contain**: Isolate affected systems
5. **Eradicate**: Fix root cause
6. **Recover**: Restore from backup if needed
7. **Post-Incident**: Review, document, improve

### Escalation Path
- **Critical (P1)**: All hands; wake up on-call; notify management
- **High (P2)**: Notify team lead within 1 hour; fix within 4 hours
- **Medium (P3)**: Notify team within business hours; fix within 24 hours
- **Low (P4)**: Log and track; fix in next sprint

---

## References
- SECURITY-HARDENING.md: Comprehensive security design
- ARCHITECTURE.md: Database security model
- DEPLOYMENT.md: Infrastructure & monitoring
- Supabase Docs: https://supabase.com/docs
- OWASP: https://owasp.org/Top10/

---

**Last Updated**: 2026-09-19  
**Next Review**: 2026-10-19
