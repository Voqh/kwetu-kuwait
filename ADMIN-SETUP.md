# Admin Operations Setup

## Environment Variables (Set in Netlify)

Required for Phase 1, 2, and 3 to work:

| Variable | Value | Source |
|----------|-------|--------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | (secret key) | Supabase project settings → API → Service Role (kept secret!) |
| `ADMIN_SECRET` | (your shared secret) | You generate this; share privately with admins only |

**Do NOT commit these to git.** Add to Netlify dashboard:
1. Netlify dashboard → Site settings → Build & deploy → Environment
2. Add the three variables above
3. Redeploy

---

## Deployment Steps

### 1. Apply Migration
Run the migration on your Supabase instance:
```sql
-- Copy contents of migrations/20260905_006_admin_functions_and_views.sql
-- Paste in Supabase dashboard → SQL Editor → Run
```

This creates:
- `purge_log` table (audit trail)
- `moderation_queue` view
- `report_summary` view
- `moderation_reinstate_listing()` RPC
- `moderation_delete_listing()` RPC
- Updated `purge_expired_listings()` RPC

### 2. Deploy Netlify Functions
Commit the following files to git:
```
netlify/functions/purge-listings.js
netlify/functions/moderation.js
netlify/functions/export-reports.js
netlify.toml
admin.html
```

When you push to main, Netlify will:
- Build & deploy the functions
- Set up scheduled trigger for purge-listings (daily at 03:00 UTC)

### 3. Set Environment Variables
In Netlify dashboard:
1. Go to Site settings → Build & deploy → Environment
2. Add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_SECRET` (generate a strong random string)
3. Click "Save"
4. Redeploy (or wait for next push)

### 4. Verify Setup
Once deployed:

**Purge job:**
- Check Netlify Function logs: Netlify dashboard → Functions → purge-listings
- Should run daily at 03:00 UTC
- Check for "Purge complete" message in logs

**Moderation UI:**
- Visit `https://yoursite.com/admin.html`
- Enter your `ADMIN_SECRET` to log in
- Should see moderation queue (if any listed are reported)

**Export:**
- On admin page, click "Export Reports (CSV)"
- File downloads with today's date

---

## Hard Question Pass

### Question 1: Silent Failure of Scheduled Function
**Risk**: Netlify scheduled functions can silently stop firing without notification.

**Current mitigation**: Manual monitoring (operator checks logs weekly)

**Better approach**: Set up a monitoring alert
- Option A: Use Sentry/Logtail webhook to ping Slack if no purge runs in 24h
- Option B: Add a `last_purge_at` column to `purge_log`; admin page shows how long since last purge
- Option C: Use Supabase `pg_cron` extension (requires paid tier; runs in DB, not Netlify)

**Recommendation for now**: Implement Option B (add column to purge_log, show on admin page) as a low-effort safety net.

---

### Question 2: Shared Admin Secret vs. Real Auth
**Current**: Single `ADMIN_SECRET` shared among all admins. Risk: if one admin compromises the secret, all share blame.

**When to upgrade**:
- If more than 2 admins need access
- If audit trail (who did what) becomes important
- If you want granular permissions (one admin can delete, another can only view)

**Upgrade path**: Add a simple `admin_users` table (username + hashed password) + JWT session auth. This is a ~6-hour job but only needed if team grows beyond solo operator.

**Recommendation for now**: Stick with shared secret. Revisit when/if you add a second admin.

---

## Rollback

If something goes wrong:

1. **Remove scheduled function**: Delete the `[[scheduled_functions]]` section from netlify.toml, commit, re-deploy
2. **Disable moderation/export**: Replace `admin.html` with a stub (or delete it)
3. **Restore old schema**: Not needed; new RPCs/views are additive (won't break existing code)

---

## Monitoring Checklist

Add to your weekly/monthly routine:

- [ ] Check purge_log table: `SELECT * FROM purge_log ORDER BY purged_at DESC LIMIT 5;`
  - Is `listings_purged` > 0? (Means contacts and old listings are being scrubbed)
  - Any error messages?
- [ ] Check moderation queue: Visit admin.html
  - Are false-positive reports being reinstated promptly?
  - Any patterns in report reasons?
- [ ] Check export: Download CSV
  - Are there repeat offenders (same phone number)?
  - Common report reason (spam, scam, offensive)?

---

## Next Steps (Optional, Lower Priority)

1. **Better logging**: Add `netlify/functions/admin-log.js` to log all admin actions (who reinstated what, when)
2. **Alerting**: Slack webhook when purge fails or queue exceeds 10 items
3. **Analytics**: Chart of listings/day, reports/day, hide rate over time
4. **Appeal process**: Email form for owners to dispute a hidden listing (not automated; sends to operator)

