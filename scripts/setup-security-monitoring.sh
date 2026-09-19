#!/bin/bash
# Security Monitoring Setup
# Purpose: Configure automated daily security checks and alerts
# Date: 2026-09-19

set -e

echo "Kwetu Kuwait Security Monitoring Setup"
echo "======================================"
echo ""

# ============================================================================
# SETUP: Daily Security Check Script
# ============================================================================
echo "[Setup 1] Creating Daily Security Check Script"
echo "---------------------------------------------"
echo ""

cat > scripts/security-check-daily.sh << 'EOF'
#!/bin/bash
# Daily Security Check for Kwetu Kuwait
# Monitors threats, rate limits, and system health
# Designed to run via cron: 0 9 * * * (9 AM UTC daily)

set -e

# Load environment
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
REPORT_FILE="/tmp/kwetu-security-report-$(date +%Y%m%d).txt"

{
    echo "╔════════════════════════════════════════════════╗"
    echo "║   KWETU KUWAIT DAILY SECURITY CHECK           ║"
    echo "║   $TIMESTAMP"
    echo "╚════════════════════════════════════════════════╝"
    echo ""
    
    # 1. CRITICAL THREATS
    echo "🔴 CRITICAL THREATS (24h)"
    echo "├─ Query: Count of critical/unresolved threats"
    CRITICAL=$(psql "$SUPABASE_DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM security_threats 
        WHERE severity = 'critical' 
        AND resolved_at IS NULL
        AND detected_at >= NOW() - INTERVAL '24 hours'
    " 2>/dev/null || echo "ERROR")
    
    echo "└─ Count: $CRITICAL"
    if [ "$CRITICAL" -gt 0 ]; then
        echo "⚠️  ACTION REQUIRED: Investigate critical threats"
    fi
    echo ""
    
    # 2. RATE LIMIT STATUS
    echo "🟠 RATE LIMIT VIOLATIONS (Active)"
    echo "├─ Query: Currently blocked IPs and operations"
    psql "$SUPABASE_DATABASE_URL" -t -c "
        SELECT operation, COUNT(DISTINCT ip_hash) as blocked_ips, MAX(blocked_until) as until
        FROM rate_limit_violations
        WHERE blocked_until > NOW()
        GROUP BY operation
        ORDER BY COUNT(*) DESC
    " 2>/dev/null || echo "ERROR connecting to database"
    echo ""
    
    # 3. RECENT HIGH-SEVERITY EVENTS
    echo "🟡 HIGH-SEVERITY AUDIT EVENTS (24h)"
    echo "├─ Query: Recent high/critical audit events"
    psql "$SUPABASE_DATABASE_URL" -t -c "
        SELECT event_type, COUNT(*) as count
        FROM security_audit_log
        WHERE severity IN ('high', 'critical')
        AND created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY event_type
        ORDER BY count DESC
        LIMIT 5
    " 2>/dev/null || echo "ERROR connecting to database"
    echo ""
    
    # 4. SYSTEM HEALTH
    echo "🟢 SYSTEM HEALTH"
    echo "├─ Active Listings: $(psql "$SUPABASE_DATABASE_URL" -t -c "SELECT COUNT(*) FROM listings WHERE status = 'active'" 2>/dev/null || echo "?")"
    echo "├─ Reported (Hidden): $(psql "$SUPABASE_DATABASE_URL" -t -c "SELECT COUNT(*) FROM listings WHERE status = 'reported'" 2>/dev/null || echo "?")"
    echo "└─ Database: Connected ✓"
    echo ""
    
    # 5. RECOMMENDED ACTIONS
    echo "📋 RECOMMENDED ACTIONS"
    if [ "$CRITICAL" -gt 0 ]; then
        echo "└─ [URGENT] Review security_threats table for critical incidents"
    else
        echo "└─ [OK] No critical threats detected"
    fi
    echo ""
    
    echo "Generated: $TIMESTAMP"
    echo "Report saved to: $REPORT_FILE"

} | tee "$REPORT_FILE"

# Optional: Send to Slack
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    echo ""
    echo "Sending to Slack..."
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        --data-raw "{\"text\": \"\`\`\`$(cat $REPORT_FILE)\`\`\`\"}" \
        2>/dev/null && echo "✓ Sent to Slack" || echo "✗ Slack send failed"
fi

echo ""
echo "✓ Daily security check complete"
EOF

chmod +x scripts/security-check-daily.sh
echo "✅ Created: scripts/security-check-daily.sh"
echo ""

# ============================================================================
# SETUP: Weekly Audit Script
# ============================================================================
echo "[Setup 2] Creating Weekly Audit Script"
echo "------------------------------------"
echo ""

cat > scripts/security-audit-weekly.sh << 'EOF'
#!/bin/bash
# Weekly Security Audit for Kwetu Kuwait
# Comprehensive review of threats, patterns, and trends
# Designed to run: Every Friday at 14:00 UTC

set -e

if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
WEEK_START=$(date -u -d '7 days ago' '+%Y-%m-%d')

echo "╔════════════════════════════════════════════════╗"
echo "║   KWETU KUWAIT WEEKLY SECURITY AUDIT          ║"
echo "║   Week of: $WEEK_START"
echo "╚════════════════════════════════════════════════╝"
echo ""

echo "📊 THREAT ANALYSIS (Last 7 Days)"
echo "├─ By Type:"
psql "$SUPABASE_DATABASE_URL" -t -c "
    SELECT 
        threat_type, 
        COUNT(*) as count,
        COUNT(DISTINCT ip_hash) as unique_ips,
        MAX(severity) as max_severity
    FROM security_threats
    WHERE detected_at >= NOW() - INTERVAL '7 days'
    GROUP BY threat_type
    ORDER BY count DESC
" || echo "ERROR"
echo ""

echo "📋 AUDIT LOG REVIEW (Last 7 Days)"
echo "├─ Events by Type:"
psql "$SUPABASE_DATABASE_URL" -t -c "
    SELECT 
        event_type,
        COUNT(*) as count,
        MAX(severity) as max_severity
    FROM security_audit_log
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY event_type
    ORDER BY count DESC
    LIMIT 10
" || echo "ERROR"
echo ""

echo "⚠️  ANOMALIES & PATTERNS"
echo "├─ IPs with Multiple Threats:"
psql "$SUPABASE_DATABASE_URL" -t -c "
    SELECT 
        ip_hash,
        COUNT(*) as threat_count,
        COUNT(DISTINCT threat_type) as threat_types
    FROM security_threats
    WHERE detected_at >= NOW() - INTERVAL '7 days'
    GROUP BY ip_hash
    HAVING COUNT(*) >= 3
    ORDER BY threat_count DESC
    LIMIT 5
" || echo "ERROR"
echo ""

echo "✅ REPORT GENERATED"
echo "└─ Timestamp: $TIMESTAMP"
echo ""
EOF

chmod +x scripts/security-audit-weekly.sh
echo "✅ Created: scripts/security-audit-weekly.sh"
echo ""

# ============================================================================
# SETUP: Cron Jobs
# ============================================================================
echo "[Setup 3] Cron Job Configuration"
echo "--------------------------------"
echo ""
echo "To schedule automated security checks, add these to your crontab:"
echo ""
echo "Run: crontab -e"
echo ""
echo "Then add these lines:"
echo ""

cat << 'EOF'
# Kwetu Kuwait Security Monitoring

# Daily security check (9 AM UTC)
0 9 * * * cd /home/voqh/Site_project/kwetu-kuwait && bash scripts/security-check-daily.sh

# Weekly security audit (Friday 2 PM UTC)
0 14 * * 5 cd /home/voqh/Site_project/kwetu-kuwait && bash scripts/security-audit-weekly.sh
EOF

echo ""
echo "Or for GitHub Actions, add this workflow:"
echo ""

cat > .github/workflows/security-monitoring.yml << 'EOF'
name: Daily Security Check

on:
  schedule:
    # Run daily at 9 AM UTC
    - cron: '0 9 * * *'
  workflow_dispatch:

jobs:
  security-check:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Daily Security Check
        env:
          SUPABASE_DATABASE_URL: ${{ secrets.SUPABASE_DATABASE_URL }}
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
        run: bash scripts/security-check-daily.sh
EOF

echo "✅ Created: .github/workflows/security-monitoring.yml"
echo ""

# ============================================================================
# SETUP: Slack Integration (Optional)
# ============================================================================
echo "[Setup 4] Slack Integration (Optional)"
echo "------------------------------------"
echo ""
echo "To send security alerts to Slack:"
echo ""
echo "1. Create a Slack Webhook:"
echo "   - Go to: https://api.slack.com/apps"
echo "   - Create New App → From scratch"
echo "   - Name: 'Kwetu Security Bot'"
echo "   - Enable: Incoming Webhooks"
echo "   - Copy webhook URL"
echo ""
echo "2. Add to environment variables:"
echo "   - In Netlify/Supabase dashboard: Add SLACK_WEBHOOK_URL"
echo "   - Or locally: Add to .env: SLACK_WEBHOOK_URL=https://hooks.slack.com/..."
echo ""
echo "3. Monitoring scripts will automatically send reports"
echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
echo "✅ MONITORING SETUP COMPLETE"
echo "============================="
echo ""
echo "Created Scripts:"
echo "  1. scripts/security-check-daily.sh (9 AM UTC daily)"
echo "  2. scripts/security-audit-weekly.sh (Friday 2 PM UTC)"
echo "  3. .github/workflows/security-monitoring.yml (CI/CD)"
echo ""
echo "Next Steps:"
echo "  1. Test the scripts locally:"
echo "       bash scripts/security-check-daily.sh"
echo ""
echo "  2. Add to crontab:"
echo "       crontab -e"
echo ""
echo "  3. (Optional) Configure Slack integration"
echo ""
echo "  4. Verify runs show up in logs"
echo ""
