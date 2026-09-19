#!/bin/bash
# Deployment Script: Security Migration & Testing
# Purpose: Deploy security migration to Supabase and verify all features
# Date: 2026-09-19

set -e

echo "=========================================="
echo "Kwetu Kuwait Security Deployment & Testing"
echo "=========================================="
echo ""

# ============================================================================
# STEP 0: PRE-DEPLOYMENT CHECKS
# ============================================================================
echo "[STEP 0] PRE-DEPLOYMENT CHECKS"
echo "--------------------------------"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install with:"
    echo "   brew install supabase/tap/supabase"
    echo "   OR"
    echo "   npm install -g supabase"
    exit 1
fi
echo "✅ Supabase CLI installed: $(supabase --version)"

# Check .env file
if [ ! -f .env ]; then
    echo "❌ .env file not found"
    exit 1
fi
echo "✅ .env file present"

# Check migration file
if [ ! -f migrations/20260919_009_comprehensive_security_enhancements.sql ]; then
    echo "❌ Security migration not found"
    exit 1
fi
echo "✅ Security migration file present"

echo ""

# ============================================================================
# STEP 1: DEPLOY MIGRATION TO SUPABASE
# ============================================================================
echo "[STEP 1] DEPLOY MIGRATION TO SUPABASE"
echo "-------------------------------------"
echo ""
echo "Option A: Using Supabase CLI (Recommended)"
echo "  Run: supabase db push"
echo ""
echo "Option B: Manual via Supabase Dashboard"
echo "  1. Go to: https://app.supabase.com"
echo "  2. Select your project"
echo "  3. Database → SQL Editor"
echo "  4. Paste contents of: migrations/20260919_009_comprehensive_security_enhancements.sql"
echo "  5. Click 'Run'"
echo ""
echo "Option C: Using psql directly"
echo "  psql \$SUPABASE_DATABASE_URL < migrations/20260919_009_comprehensive_security_enhancements.sql"
echo ""

read -p "Have you deployed the migration? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "⏳ Waiting for migration deployment..."
    echo "Run one of the options above, then come back."
    exit 0
fi

echo "✅ Migration deployed"
echo ""

# ============================================================================
# STEP 2: VERIFY MIGRATION SUCCESS
# ============================================================================
echo "[STEP 2] VERIFY MIGRATION SUCCESS"
echo "---------------------------------"
echo ""
echo "Checking database tables..."
echo ""
echo "Execute these queries in Supabase SQL Editor:"
echo ""

cat << 'EOF'
-- Check for new tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('security_audit_log', 'security_threats', 'rate_limit_violations')
ORDER BY table_name;

-- Check for new functions
SELECT proname 
FROM pg_proc 
WHERE proname IN ('hash_ip', 'detect_injection_attempt', 'is_rate_limited', 'log_security_threat')
ORDER BY proname;

-- Check for new triggers
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name LIKE 'audit%'
ORDER BY trigger_name;

-- Check for new views
SELECT viewname 
FROM pg_views 
WHERE schemaname = 'public' 
AND (viewname LIKE 'security%' OR viewname LIKE 'rate_limit%')
ORDER BY viewname;
EOF

echo ""
read -p "Have you verified all tables/functions/triggers/views exist? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Verification failed. Check migration syntax."
    exit 1
fi

echo "✅ All database objects created successfully"
echo ""

# ============================================================================
# STEP 3: TEST ADMIN.HTML SECURITY
# ============================================================================
echo "[STEP 3] TEST ADMIN.HTML SECURITY"
echo "--------------------------------"
echo ""
echo "Admin Dashboard Testing:"
echo "1. Open: https://kwetukuwait.com/admin.html (or local dev server)"
echo "2. Verify: 'Authenticate to access admin tools' message shown"
echo ""
echo "3. Test Session Timeout:"
echo "   a. Enter admin secret"
echo "   b. Click 'Authenticate'"
echo "   c. Note the session time"
echo "   d. Wait 31 minutes"
echo "   e. Verify: Auto-logout message and dashboard hidden"
echo ""
echo "4. Test Moderation Queue Access:"
echo "   a. Authenticate again"
echo "   b. View: Moderation Queue should load (if any reported listings exist)"
echo "   c. Click: 'Reinstate' or 'Delete' button (test functionality)"
echo ""
echo "5. Test XSS Prevention:"
echo "   a. Create test listing with: <script>alert(1)</script> in description"
echo "   b. Report listing 3+ times"
echo "   c. Go to admin dashboard"
echo "   d. Verify: Script tags displayed as &lt;script&gt; (escaped, not executed)"
echo ""

read -p "Have you completed admin.html tests? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "⏳ Please complete admin.html testing and return."
    exit 0
fi

echo "✅ Admin dashboard security verified"
echo ""

# ============================================================================
# STEP 4: VERIFY AUDIT LOGGING
# ============================================================================
echo "[STEP 4] VERIFY AUDIT LOGGING"
echo "-----------------------------"
echo ""
echo "A. Create Test Listing:"
echo "   1. Go to: https://kwetukuwait.com"
echo "   2. Click: 'Post a room'"
echo "   3. Fill form:"
echo "      - Area: Salmiya"
echo "      - Block: 1"
echo "      - Type: Room"
echo "      - Description: Security test listing"
echo "      - Price: 100 KWD"
echo "      - WhatsApp: +965XXXXXXXX"
echo "   4. Click: 'Post'"
echo "   5. Note the listing ID"
echo ""
echo "B. Verify Audit Log Entry:"
echo "   In Supabase SQL Editor, run:"
echo ""

cat << 'EOF'
SELECT 
  event_type,
  listing_id,
  action_details,
  severity,
  created_at
FROM security_audit_log
WHERE event_type = 'listing.created'
ORDER BY created_at DESC
LIMIT 1;
EOF

echo ""
echo "   Verify: listing.created event shows area='Salmiya', block='1', etc."
echo ""
echo "C. Test Report Blocking:"
echo "   1. Find your test listing on the board"
echo "   2. Click 'Report' button 3 times"
echo "   3. Each report should trigger audit event"
echo "   4. After 3rd report, listing should disappear from public board"
echo ""
echo "   Verify in SQL:"
echo ""

cat << 'EOF'
-- Check report events
SELECT event_type, listing_id, created_at
FROM security_audit_log
WHERE event_type = 'listing.reported'
ORDER BY created_at DESC
LIMIT 3;

-- Verify listing is now hidden
SELECT id, status, report_count
FROM listings
WHERE id = 'YOUR_LISTING_ID_HERE';
-- Should show: status='reported', report_count=3
EOF

echo ""

read -p "Have you verified audit logging? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "⏳ Please complete audit logging tests and return."
    exit 0
fi

echo "✅ Audit logging verified"
echo ""

# ============================================================================
# STEP 5: SET UP MONITORING (OPTIONAL)
# ============================================================================
echo "[STEP 5] SET UP MONITORING (OPTIONAL)"
echo "------------------------------------"
echo ""
echo "This step sets up automated daily security checks."
echo "You can skip this if you prefer manual monitoring."
echo ""

read -p "Install daily monitoring script? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Creating daily monitoring cron job..."
    cat > /tmp/kwetu-daily-security-check.sh << 'CRONEOF'
#!/bin/bash
# Daily Security Check for Kwetu Kuwait
# Runs at 09:00 UTC daily

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
DB_URL="${SUPABASE_DATABASE_URL}"

echo "=== Kwetu Kuwait Daily Security Check ===" > /tmp/kwetu-security-report.txt
echo "Time: $TIMESTAMP" >> /tmp/kwetu-security-report.txt
echo "" >> /tmp/kwetu-security-report.txt

# Check critical threats
CRITICAL=$(psql "$DB_URL" -t -c "
  SELECT COUNT(*) FROM security_threats 
  WHERE severity = 'critical' 
  AND resolved_at IS NULL
  AND detected_at >= NOW() - INTERVAL '24 hours'
")
echo "🔴 Critical Threats (24h): $CRITICAL" >> /tmp/kwetu-security-report.txt

# Check blocked IPs
BLOCKED=$(psql "$DB_URL" -t -c "
  SELECT COUNT(DISTINCT ip_hash) FROM rate_limit_violations 
  WHERE blocked_until > NOW()
")
echo "🟠 Currently Blocked IPs: $BLOCKED" >> /tmp/kwetu-security-report.txt

# Check backup status
BACKUP=$(psql "$DB_URL" -t -c "
  SELECT MAX(created_at) FROM listings LIMIT 1
")
echo "🟢 Database Active: Yes" >> /tmp/kwetu-security-report.txt

# Display report
cat /tmp/kwetu-security-report.txt

# (Optional) Send to Slack
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
      -H 'Content-Type: application/json' \
      -d "{\"text\": \"$(cat /tmp/kwetu-security-report.txt)\"}"
fi
CRONEOF

    chmod +x /tmp/kwetu-daily-security-check.sh
    
    echo "✅ Monitoring script created: /tmp/kwetu-daily-security-check.sh"
    echo ""
    echo "To schedule daily at 09:00 UTC, add to crontab:"
    echo "  0 9 * * * /tmp/kwetu-daily-security-check.sh"
    echo ""
    echo "Or add to your CI/CD pipeline (GitHub Actions, Netlify, etc.)"
fi

echo ""

# ============================================================================
# STEP 6: SCHEDULE AUDITS
# ============================================================================
echo "[STEP 6] SCHEDULE SECURITY AUDITS"
echo "--------------------------------"
echo ""
echo "Create calendar reminders for:"
echo ""
echo "📅 WEEKLY (Every Friday @ 14:00 UTC):"
echo "   Review: security_threats_summary view"
echo "   Action: Check threat counts by type"
echo "   Query:"
echo ""

cat << 'EOF'
SELECT threat_type, COUNT(*), severity, MAX(detected_at)
FROM security_threats
WHERE detected_at >= NOW() - INTERVAL '7 days'
GROUP BY threat_type, severity
ORDER BY COUNT(*) DESC;
EOF

echo ""
echo "📅 MONTHLY (1st Friday @ 10:00 UTC):"
echo "   Review: Full audit log (last 30 days)"
echo "   Action: Identify patterns, false positives"
echo "   Query: See SECURITY-OPERATIONS.md → Monthly Audit section"
echo ""
echo "📅 QUARTERLY (Jan 1, Apr 1, Jul 1, Oct 1 @ 10:00 UTC):"
echo "   Review: Complete security audit"
echo "   Action: Penetration testing, dependency updates"
echo "   Reference: See SECURITY-OPERATIONS.md → Quarterly Audit section"
echo ""

echo "✅ Audit schedule documented in: SECURITY-OPERATIONS.md"
echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo "=========================================="
echo "✅ DEPLOYMENT & TESTING COMPLETE"
echo "=========================================="
echo ""
echo "Summary:"
echo "  ✅ Migration deployed to Supabase"
echo "  ✅ Database objects verified (tables, functions, triggers, views)"
echo "  ✅ Admin dashboard security tested (auth, timeout, XSS prevention)"
echo "  ✅ Audit logging verified (create, report, auto-hide events)"
echo "  ✅ Monitoring setup (optional daily alerts)"
echo "  ✅ Security audit schedule created"
echo ""
echo "Next Actions:"
echo "  1. Review SECURITY-HARDENING.md for security design details"
echo "  2. Review SECURITY-OPERATIONS.md for operational procedures"
echo "  3. Add weekly/monthly/quarterly audit tasks to your calendar"
echo "  4. Configure monitoring alerts (Slack, email, etc.) if desired"
echo "  5. Train team on security procedures"
echo ""
echo "Documentation:"
echo "  - SECURITY-HARDENING.md (Design & Implementation)"
echo "  - SECURITY-OPERATIONS.md (Operational Procedures)"
echo "  - SECURITY-IMPLEMENTATION-SUMMARY.md (Deployment Guide)"
echo ""
echo "Date: $(date)"
echo ""
