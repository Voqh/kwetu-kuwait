# SCALING-ROADMAP.md — Known Limits, Edge Cases & Future Work

This document consolidates the stress-test pass results (Phase 4 from the foundation docs process). It serves as a reference for **what will break, what's risky, and what to prioritize** as Kwetu Kuwait grows.

---

## Section 1: Scaling Limits (What Breaks First at 10K+ Users)

These are hard limits of the current free-tier infrastructure. When hit, the system will degrade or go offline.

### Limit #1: Supabase Storage (500MB)

| Metric | Current | Risk | Timeline |
|--------|---------|------|----------|
| Estimated storage per listing | ~2KB (text fields) | Hit at ~10K listings | ~3–6 months (depending on growth) |
| Audit trail per listing | ~1KB (reports + edit sessions) | Hit at ~5K–8K highly-reported listings | ~2–4 months |
| **Total free quota** | 500MB | Once exceeded, writes fail | Hard limit |

**What happens when hit**:
- INSERT and UPDATE queries fail with "storage quota exceeded"
- New listings cannot be posted
- Existing listings can still be viewed (reads don't fail)
- Poster experiences "Error posting listing"

**Mitigation**:
- [ ] Upgrade Supabase to paid tier ($25/mo → 10GB storage)
- [ ] OR implement data archival: move listings >90 days old to cold storage (S3)
- [ ] OR delete report records after 30 days (loses audit trail, but saves space)

**Priority**: High. Storage is the first bottleneck.

---

### Limit #2: Supabase Egress (2GB/month)

| Metric | Current | Risk | Timeline |
|--------|---------|------|----------|
| Average list download | ~100KB (fetch all listings + area counts) | Hit at ~10K daily searchers | ~1–3 months |
| Free tier quota | 2GB/month | Once exceeded, queries charge $0.09/GB | Hard limit |
| **Cost at 10K DAU** | ~5GB/month = ~$0.27/day = ~$8/month extra | Beyond free tier | Immediate overage |

**What happens when hit**:
- Searches become slower (Supabase throttles)
- Dashboard alerts; overage charges apply
- User experience degrades but doesn't fully break

**Mitigation**:
- [ ] Add query caching (Netlify edge functions cache area counts for 5 min)
- [ ] Compress responses (gzip already applied by Supabase)
- [ ] Paginate results (return top 20 per area instead of all)
- [ ] Upgrade to paid tier (higher egress allowance)

**Priority**: Medium. Egress is slower-onset than storage.

---

### Limit #3: Supabase Auto-Pause (7 Days Inactive)

| Issue | Current | Risk | Timeline |
|-------|---------|------|----------|
| Free tier auto-pause after 7 days idle | Always on | DB goes offline unexpectedly | Every 7 days without pings |
| Current workaround | UptimeRobot pings /purge-listings with query-param API key | Fragile, key exposed in logs | Next time it fails |
| **Reliability** | ~95% (UptimeRobot can miss pings) | Board goes offline for hours | Monthly (typically recovers within 30 min) |

**What happens when hit**:
- All queries timeout
- "Error: Database is paused" message
- Manual wake-up required (Supabase dashboard or API call)

**Mitigation**:
- [ ] Deploy scheduled purge job (Netlify function, Lambda, or Supabase pg_cron on paid tier)
- [ ] Set up alerting (PagerDuty, Slack) if DB is paused >5 min
- [ ] Move to paid Supabase ($25/mo → no auto-pause)

**Priority**: High. This is a reliability issue, not a scaling issue.

---

## Section 2: Edge Cases (Bugs at Scale, Not Covered by Current Logic)

### Edge Case #1: Coordinated Abuse (Organized Reports)

| Scenario | Current Behavior | Problem |
|----------|------------------|---------|
| Day 1: One bad actor reports a listing twice from different browsers | Report #1 accepted, report #2 rejected (1-per-day limit) | Server-side dedup works ✅ |
| Day 1–3: Three different users report the same listing (one per day) | Reports on Day 1, 2, 3 all accepted; count reaches 3 on Day 3 | Listing auto-hides after Day 3 ✅ |
| **Coordinated**: 10 users, each reporting the same innocent listing on different days | 10 reports accepted; listing hidden on Day 3 | Listing is hidden even though no single report source is abusing the system ❌ **GAP** |
| Owner tries to defend or repost listing | No appeal process; owner must use new token (new UUID) | Community trust eroded; no way to clear false reports |

**Why it happens**: Report threshold (3) is global and low; no reputation/identity tracking means we can't distinguish "10 different users legitimately reporting abuse" from "1 coordinated group griefing."

**Current design rationale**: False negatives (spam stays up) are worse than false positives (innocent listing hidden). Owner can repost cheaply.

**Mitigation** (if this becomes a problem):
- [ ] Add admin flag to unambiguously hide/restore listings (manual review)
- [ ] Increase report threshold to 5 (trades off false-negatives)
- [ ] Add "appeal" form (owner proves listing is legitimate; admin reviews)
- [ ] Implement lightweight reputation (track report accuracy; if same user reports 100 spam correctly, weight their reports higher)

**Priority**: Low for now (abuse volume is low). Revisit monthly.

---

### Edge Case #2: Leaked Edit Token

| Scenario | Current Behavior | Problem |
|----------|------------------|---------|
| User A posts listing; shares token with User B (intentionally) | User B can edit/delete using token stored in their localStorage | No collision, works as designed ✅ |
| User A's browser is compromised; token leaked to attacker | Attacker can edit listing or delete it | Token has no expiry; attacker has permanent access ❌ **RISK** |
| User A realizes token is leaked | No way to revoke token; must delete listing and repost | Posting hassle; listing ID changes (lose URL/links) |
| Attacker changes listing contact number to theirs | User A sees their listing serving attacker's phone number | Scam risk: searchers call attacker instead of User A |

**Why it happens**: 
- Tokens are stored in plain localStorage (no encryption)
- Tokens have no expiry
- No token revocation mechanism (would require a per-token database row)

**Current design rationale**: No accounts = no password recovery = tokens must be permanent. The trade-off is that losing a token = losing edit access forever, and a leaked token is forever leaked.

**Mitigation** (if this becomes a problem):
- [ ] Add optional token expiry (e.g., "This token will expire in 1 year")
- [ ] Implement token rotation (generate new token, mark old token as "superseded")
- [ ] Add optional email confirmation for token resets (requires email in listing form)

**Priority**: Low for launch (browsers are usually private). Revisit if user complaints arise.

---

### Edge Case #3: Concurrent Edits (Race Condition)

| Scenario | Current Behavior | Problem |
|----------|------------------|---------|
| User A opens "Edit" on listing; lease opened (10-min window) | Lease stored in `listing_edit_sessions` ✅ |  |
| User A's browser refreshes (accidentally closes edit form) | Lease is still active for 10 min (User A forgot to save) |  |
| User B independently opens same listing "Edit" URL in same or different browser | `begin_public_listing_edit()` issues a NEW lease, overwriting the old one | User A's lease window is replaced ❌ |
| User A comes back and tries to save changes within the original 10 min | `update_public_listing()` checks `edit_lease_expires_at > now()` | Check passes (lease was reset by User B) ✅ (accidentally) |
| **Problem**: User A's changes and User B's changes are saved independently; last-write-wins | No merge conflict detection | Data loss: User A's changes may be overwritten by User B's save |

**Why it happens**:
- Leases are stored per-listing, not per-session
- No transaction-level locking (PostgreSQL FOR UPDATE would solve this, but adds complexity)

**Current design rationale**: Simplicity for solo operator. Likelihood of two users editing same listing simultaneously is low (no social features, discovery is by area, not by listing UUID).

**Mitigation** (if this becomes a problem):
- [ ] Implement optimistic locking (add `version_id INT` to listings; increment on each update; update fails if version doesn't match)
- [ ] Implement pessimistic locking (FOR UPDATE in SQL; hold lock for 10 min; only one editor at a time)
- [ ] Add client-side warning (show who else is editing; "Another user is editing this listing")

**Priority**: Very low for launch. Revisit only if multiple concurrent editors become common (unlikely).

---

## Section 3: Over-Engineered (Complexity That Doesn't Pay Off)

### Design #1: bcrypt Hashing of Tokens

| Decision | Rationale | Reality | Trade-off |
|----------|-----------|---------|-----------|
| Hash edit tokens using bcrypt (not plain text) | Industry best practice; if DB is compromised, attacker doesn't get plain tokens | Attacker would need to compromise DB *and* browser localStorage | CPU cost: ~100ms per token comparison (every edit) |
| Alternative: Salt + hash (e.g., SHA-256 + salt) | Faster (~1ms), still secure against DB compromise | In Kwetu's threat model, if DB is compromised, infrastructure is compromised anyway | Saves 99ms per edit |

**Assessment**: **Correct decision, not over-engineered.**

Rationale: bcrypt is the standard for password hashing; using anything weaker would be a red flag in security reviews. The CPU cost is acceptable (one per edit session, not per request).

**No change recommended.**

---

### Design #2: Separate `listing_edit_sessions` Table

| Decision | Rationale | Reality | Trade-off |
|----------|-----------|---------|-----------|
| Store tokens in separate table with RLS revoked | Prevents accidental token exposure via RLS holes | Adds one JOIN per edit; 2 rows per listing (listings + session) | DB design purity; prevents future bugs |
| Alternative: Store `token_hash` directly in listings table | Simpler schema; one row per listing | RLS SELECT policy would need to exclude token_hash column; easy to miss in future; accidental exposure risk | Risk > benefit |

**Assessment**: **Correct decision, not over-engineered.**

Rationale: Separation prevents a whole class of bugs (RLS column filtering is error-prone). The one extra JOIN is negligible.

**No change recommended.**

---

## Section 4: Under-Engineered (Missing, Deferred, or Too Simple)

### Missing #1: Scheduled Purge Job (HIGH PRIORITY)

| What | Current | Gap |
|------|---------|-----|
| Listing purge (`scrub_contact + delete >37 days`) | Manual trigger via UptimeRobot HTTP endpoint | Fragile, not guaranteed to run |
| Lease cleanup (delete stale leases) | Part of purge job | Same fragility |
| Contact scrubbing (set whatsapp_e164 = null at day 30) | Part of purge job | Delayed; contact exposed longer than designed |

**Why it matters**:
- Without purge, DB storage fills up (Limit #1 above)
- Without purge, contact numbers linger (privacy risk)
- UptimeRobot is a band-aid; query-param auth leaks API key in logs

**Action items**:
- [ ] Deploy `purge_expired_listings()` as a scheduled job ASAP (Netlify function, AWS Lambda, or Supabase pg_cron)
- [ ] Set up alerting if job fails
- [ ] Remove UptimeRobot workaround

**Timeline**: Week 1 of production. This is blocking.

**Effort**: ~30 min (Netlify function + GitHub Actions trigger).

---

### Missing #2: Moderation Queue (No Admin Appeal)

| Feature | Current | Gap |
|---------|---------|-----|
| Listing reported | Status auto-hidden after 3 reports | ✅ Works |
| Operator reviews false report | No UI; must query DB manually | ❌ GAP |
| Operator wants to un-hide listing | Must manually UPDATE status = 'active' in DB | ❌ Error-prone |
| Owner wants to dispute report | No appeal form or mechanism | ❌ GAP |

**Why it matters**:
- If a legitimate listing is hidden (false positive), owner can't get help
- Operator must be technical (SQL knowledge) to fix errors
- No audit trail of admin actions (who undeleted what, when)

**Action items**:
- [ ] Create `/admin/` dashboard (password-protected or Supabase auth)
- [ ] List reported listings with report reasons and counts
- [ ] "Restore" button to set status = 'active' + log action
- [ ] Optional: "Appeal" form for owners (email operator to review)

**Timeline**: Month 2–3 if false positives become common. Defer for now.

**Effort**: ~4 hours (2 RPC methods + simple UI).

---

### Missing #3: Data Export (Analytics & Abuse Analysis)

| Feature | Current | Gap |
|---------|---------|-----|
| Operator wants to analyze posting trends | Can query DB but must write SQL | ❌ No self-service |
| Operator wants to find serial abusers | No way to group reports by pattern (same phone number, description keywords, etc.) | ❌ GAP |
| Operator wants to export listings as CSV | Must manually download from Supabase dashboard | ❌ Manual, error-prone |

**Why it matters**:
- Without analytics, operator flies blind (doesn't know if abuse is growing)
- Without pattern detection, same abuser can repost under new listing 100 times
- Without exports, hard to share data with legal team or partners

**Action items**:
- [ ] Create `/admin/export` endpoint (CSV of active listings, reports, banned patterns)
- [ ] Add "Reports by phone number" query (find serial abusers)
- [ ] Add charts: listings/day, reports/day, report-to-hide rate

**Timeline**: Month 3+ (nice-to-have). Defer unless abuse is high.

**Effort**: ~6 hours (analytics queries + simple charting).

---

### Missing #4: User Consent for Phone Display (Design Debt)

| Question | Current | Gap |
|----------|---------|-----|
| Should searchers see the WhatsApp number in listing? | Yes (always shown) | ✅ Works for simple use case |
| Should poster have option to hide their number until first contact? | Not currently offered | ❌ Feature gap |
| What if poster wants to post but protect their identity initially? | Can't; number is public immediately | ❌ UX gap |

**Why it matters**:
- Some posters may be afraid of harassment or pricing discrimination
- Searchers might call instead of WhatsApp (unsolicited)
- Privacy-conscious users feel exposed

**Action items**:
- [ ] (Optional) Add checkbox: "Show my number in listing?" (default: yes)
- [ ] If unchecked: searchers see "Contact via WhatsApp" button (no number shown); click opens WhatsApp web
- [ ] Posterior clarification: does "no phone display" reduce trust? Test with users.

**Timeline**: Month 2–3 if user complaints arise. Defer for now.

**Effort**: ~2 hours (1 field + conditional rendering).

---

## Section 5: Priority Matrix (Updated Sept 4, 2026)

### ✅ Completed (Phase 4 Implementation)
- [x] **Deploy scheduled purge job** (prevents DB storage overflow; fixes UptimeRobot fragility)
  - Migration: 20260905_006_admin_functions_and_views.sql
  - Function: netlify/functions/purge-listings.js (daily @ 03:00 UTC)
  - Logging: purge_log table captures results for monitoring
- [x] **Moderation queue UI** (handles false positives gracefully)
  - Views: moderation_queue, report_summary
  - RPCs: moderation_reinstate_listing(), moderation_delete_listing()
  - UI: admin.html with secret-protected access
  - API: netlify/functions/moderation.js
- [x] **Data export + analytics** (understand abuse patterns)
  - View: report_summary (frequency by reason, phone, area)
  - API: netlify/functions/export-reports.js (CSV download)
  - UI: Export button on admin.html

### Do Next (High Value, Low Effort)
- [ ] **Better alerting** (know when purge fails or DB is paused)
  - Add `last_purge_at` check to admin page
  - Set up Slack webhook if purge_log has no entries >24h
- [ ] Create `.env.example` (operability guide)
- [ ] Add monitoring dashboard (weekly traffic, reports, abuse trends)

### Do Later (Medium Value, Medium Effort)
- [ ] **Token revocation** (handles leaked tokens)
  - Add optional email field to listings
  - Implement email-based token reset link
  - Requires paid Supabase + email integration (Sendgrid, Netlify email)
- [ ] **Real admin auth** (upgrade from shared secret to username/password)
  - Add admin_users table + JWT session management
  - ~6 hours work; defer until team grows beyond 1 operator
- [ ] **Optimistic locking** (prevent concurrent edit data loss)
  - Add version_id column to listings
  - Check version before updating; reject if outdated
  - Low priority; concurrent edits are extremely rare

### Don't Do Yet (Low Priority or High Complexity)
- [ ] Optimize for 100K users (Supabase scaling; probably move to paid tier anyway)
- [ ] Reputation system (adds authentication complexity; out of scope)
- [ ] Concurrent edit conflict resolution (very rare; manual review sufficient)

---

## Appendix: Monitoring & Alert Setup

**Recommended alerts** (set up on Supabase or Netlify):

1. **Database Storage >80%** → Slack to operator
2. **Egress >1.5GB/month** → Email operator (trend warning)
3. **API Error Rate >1%** → PagerDuty (wake up if DB is down)
4. **Report count >2K (all-time)** → Slack (informational; analyze patterns)

**Recommended dashboards**:
- Supabase dashboard: Storage, egress, function call counts
- Netlify Analytics: Frontend performance, error rates
- Custom: Kwetu-specific charts (listings/day, reports/day, report-to-hide rate)

---

## Summary

| Category | Status | Next Steps |
|----------|--------|-----------|
| **Scaling Limits** | Known & monitored | Upgrade Supabase if >500MB stored |
| **Edge Cases** | Known; acceptable risk for launch | Revisit monthly; add appeal process if needed |
| **Architecture** | Sound; well-engineered | No immediate changes |
| **Operational Gaps** | High-priority: purge job | Deploy Week 1 |

Kwetu Kuwait is ready for launch within current constraints. Plan for paid infrastructure in Month 2–3 as usage grows.

