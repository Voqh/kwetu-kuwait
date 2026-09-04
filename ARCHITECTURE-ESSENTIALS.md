# Kwetu Kuwait — Architecture Essentials (Quick Reference)

**This file is a condensed outline of ARCHITECTURE.md. Read this before touching code; read ARCHITECTURE.md before changing database logic.**

---

## Iron-Clad Rules (Bugs if Forgotten)

### 1. No Direct anon Table Writes
- `anon` role has ZERO INSERT/UPDATE/DELETE grants on `listings`, `listing_edit_sessions`, `listing_reports`
- **All writes go through named RPCs**, which enforce:
  - Token validation (bcrypt comparison: `crypt(p_token, token_hash)`)
  - Lease expiry checks (edit window must not be expired)
  - Input validation (length, format, range)
  - Business logic (3-report threshold, 1-report-per-day-per-listing)
- **Break this rule** = security hole (direct SQL injection path, no audit trail)

### 2. search_path Must Be Set in Every SECURITY DEFINER Function
- All RPCs use pgcrypto (`crypt`, `gen_salt`)
- Without `set search_path = public, extensions`, the function may fail silently or use wrong schema
- **Every RPC header must have**: `set search_path = public, extensions`
- **Current status**: Fixed in migration 20260830_005; verify on any new function

### 3. Edit Token Hash Is Permanent
- `listing_edit_sessions.token_hash` is NEVER deleted
- Each edit reopens a new lease window; token persists for life of listing
- **Why**: Poster has no password, no email recovery; token is sole proof of ownership
- **If you delete the row**: Poster loses edit/delete access forever, even with valid token
- Lease window expires (`edit_lease_expires_at`), but row stays

### 4. Edit Window Is Bounded; Expiry Date Is Not
- `edit_lease_expires_at`: 2-minute grace on create, 10-minute window on begin-edit; temporary
- `listings.expires_at`: 30 days from posting; **does NOT reset on edit**
- **Common mistake**: Updating expires_at on each edit → defeats auto-expiry purpose (stale board)
- **Correct**: expires_at stays fixed; only description/price/contact change

### 5. Report Threshold Triggers Auto-Hide
- Once `listings.report_count >= 3`, `status` automatically changes to `'reported'`
- RLS policy: `status = 'active' AND expires_at > now()` → reported listings are invisible
- Owner can still see their listing via `get_listing_for_owner()` (SECURITY DEFINER bypasses RLS)
- **No appeal process**: Low threshold is intentional (false positive = cheap repost)

### 6. Contact Scrub Happens Before Row Delete
- Day 30: `whatsapp_e164` is NULL'd (via `scrub_expired_listing_contact()`)
- Day 37: Row is hard-deleted (via `purge_expired_listings()`)
- **Why**: Contact is PII; delete fast. Metadata (area, description) stays for audit trail
- **If you skip scrub**: Stale phone numbers remain in DB; privacy risk

### 7. Migrations Must Be Applied In Order; Never Partially Rerun
- Each migration modifies functions/constraints/indexes
- Running migration N twice can cause the second run to find a function already defined with new signature
- **Safe pattern**: Always run the full migration file; don't cherry-pick lines
- **Unsafe**: Re-running a migration whose early steps already succeeded (check function signatures first)

### 8. Rate-Limit: 1 Report Per Listing Per UTC Day
- Migration 20260829_001 enforces this server-side
- Check `created_at >= date_trunc('day', now())` to prevent same-day duplicates
- Client-side dedup (localStorage) is a UX nicety, not a security control
- **If you remove server check**: Coordinated abuse becomes viable

---

## Test Checklist (Before Deploy)

- [ ] All functions have `set search_path = public, extensions`
- [ ] Token generation produces ≥64 chars (app.js `generateEditToken()`)
- [ ] Token hash comparison uses `crypt(p_token, existing_hash)` (not equality)
- [ ] Edit lease on create: 2 min, on begin-edit: 10 min
- [ ] Update fails if lease expired (`edit_lease_expires_at > now()`)
- [ ] Delete requires valid token (no lease needed)
- [ ] Report insert checks 1-per-day (not per-hour or per-second)
- [ ] Report count 3+ auto-hides listing (status → 'reported')
- [ ] Owner can see own hidden listing via `get_listing_for_owner()`
- [ ] Public SELECT returns only `status = 'active' AND expires_at > now()`
- [ ] Contact scrub deletes number on day 30
- [ ] Row purge deletes on day 37
- [ ] New migrations preserve existing function behavior (backward-compat unless intentional breaking change)

---

## Known Fragile Points

| Issue | Impact | Mitigation |
|-------|--------|-----------|
| UptimeRobot pings keep DB alive; query-param auth is weak | Logs expose API key; not production-grade | Deploy scheduled job (Lambda, pg_cron, or Netlify function) to call `purge_expired_listings()` |
| No IP-based rate-limiting (Supabase doesn't pass reliable IPs) | Coordinated abuse can hide a listing in 3 reports across days | Manual moderation queue; may need admin flag on listings |
| Free Supabase auto-pauses after 7 days idle; free Netlify limited builds | Board goes offline during quiet weeks; deployments can take time | Move to paid Supabase ($25/mo) or self-host; automate deployments with GitHub Actions |
| Edit tokens stored in browser localStorage (no expiry) | Leaked token = permanent edit access | Tokens are 64+ entropy; local-only; no API key reuse |
| Rent price has 3-decimal cap | Some edge-case prices don't fit (e.g., 1.25 fils) | Acceptable for Kuwaiti market; bump to 4 decimals if needed |

---

## File Manifest

| File | Purpose |
|------|---------|
| `schema.sql` | Full schema + all RPCs (source of truth) |
| `migrations/20260829_001_*` | Report rate-limit |
| `migrations/20260829_002_*` | Edit lease enforcement |
| `migrations/20260829_003_*` | Input validation + description normalization |
| `migrations/20260830_004_*` | Contact scrubbing |
| `migrations/20260830_005_*` | search_path fix + authenticated role hardening |
| `js/supabase-client.js` | Supabase client setup + all RPC wrappers |
| `js/app.js` | UI logic, search, area lists, edit/post flows |
| `index.html` | Homepage + board + area search |
| `css/style.css` | Layout, theme, animations |
| `terms.html`, `privacy.html` | Legal pages |

---

## Deployment Readiness

**Before pushing to production**:
1. Run `schema.sql` (idempotent; uses `CREATE IF NOT EXISTS`, `CREATE OR REPLACE`)
2. Apply all migrations in order (e.g., via Supabase dashboard or `psql` script)
3. Grant functions: `GRANT EXECUTE ON function_name(...) TO anon`
4. Verify RLS is enabled on all tables: `ALTER TABLE listings ENABLE ROW LEVEL SECURITY`
5. Test one complete flow: post → search → edit → delete
6. Verify report auto-hide: post → report 3 times → check status = 'reported'
7. Verify expiry: post at T → check at T+30 days that contact is NULL → check at T+37 days that row is gone

---

## Questions Before Code Changes

If you're about to:
- **Add a column**: Will RLS/RPC logic need updates?
- **Change a function signature**: Are all callers in app.js and migrations updated?
- **Modify a lease window**: Will UI timers and edit-button logic sync correctly?
- **Adjust report threshold**: What if it causes over/under-reporting?
- **Add a new RPC**: Does it have `search_path`, token validation, and audit trail?

If unsure on any of the above, read ARCHITECTURE.md first.
