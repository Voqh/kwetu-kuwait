# Kwetu Kuwait — Technical Architecture

## Stack & Rationale

| Component | Choice | Why |
|-----------|--------|-----|
| **Frontend** | Vanilla JS + HTML/CSS | No build step; runs on Netlify static; fast CDN |
| **Backend** | Supabase (PostgreSQL + PostgREST + RLS) | Free tier covers launch; RLS = token-based auth at DB layer |
| **Hosting** | Netlify (frontend) + Supabase (database) | Both free tier; no ops overhead; auto-deploy from GitHub |
| **Client Library** | @supabase/supabase-js | Official; RPC + direct SELECT support; tiny bundle |
| **Cryptography** | pgcrypto (bcrypt) + web.crypto.getRandomValues() | Bcrypt for token hashing; browser crypto for generation |
| **Deployment** | GitHub → Netlify (frontend); SQL migrations (manual or Supabase CLI) | Solo operator; CI/CD via Git hook sufficient |

---

## Data Model (Full Reference)

### Table: `listings`
**Purpose**: Core accommodation listing records. One row per posted listing.

| Column | Type | Constraints | Notes |
|--------|------|-----------|-------|
| `id` | uuid | PRIMARY KEY, default gen_random_uuid() | Unique listing ID |
| `area` | text | NOT NULL | Area name (e.g., "Salmiya", "Hawally") |
| `block` | text | — | Postal block number or zone descriptor |
| `type` | text | CHECK (type IN ('Apartment', 'Room', 'Partition', 'Bedspace')); NULL allowed | Listing category; optional to support legacy listings |
| `description` | text | — | Listing details; max 1000 chars; normalized (spaces/blank lines collapsed) |
| `rent_kwd` | numeric | CHECK (>= 0, precision = 3 decimals) | Rent price in Kuwaiti dinar; nullable for "contact for price" |
| `whatsapp_e164` | text | — | Contact number; E.164 format (nullable post-expiry) |
| `status` | text | NOT NULL, default 'active', CHECK (status IN ('active', 'reported')) | 'active' = public; 'reported' = hidden after 3+ reports |
| `created_at` | timestamptz | NOT NULL, default now() | Posted timestamp |
| `expires_at` | timestamptz | NOT NULL, default (now() + 30 days) | Auto-expiry time; does NOT reset on edit |
| `report_count` | integer | NOT NULL, default 0 | Incremented by report_listing() RPC; triggers status change at 3+ |

**Indexes**:
- `listings_area_idx`: ON (area) — filters by area in public SELECT
- `listings_expires_idx`: ON (expires_at) — finds stale rows for purge job

**RLS Policies**:
- **INSERT** (`public can insert listings`): `to anon with check (true)` — any visitor can create
- **SELECT** (`public can read live listings`): `to anon using (status = 'active' AND expires_at > now())` — only active, non-expired listings visible

---

### Table: `listing_edit_sessions`
**Purpose**: Secure storage of posting tokens and edit-lease windows. One row per listing.

| Column | Type | Constraints | Notes |
|--------|------|-----------|-------|
| `listing_id` | uuid | PRIMARY KEY, FK → listings(id) ON DELETE CASCADE | Links to its listing |
| `token_hash` | text | NOT NULL | bcrypt hash of the 64-char edit token; never deleted even after lease expires |
| `edit_lease_expires_at` | timestamptz | NOT NULL | When the current edit window closes; reset to future time by begin_public_listing_edit() |
| `editing_started_at` | timestamptz | — | Timestamp when editing began; cleared on save/close |

**Indexes**:
- `listing_edit_sessions_lease_idx`: ON (edit_lease_expires_at) — cleanup job finds expired leases

**RLS Policies**:
- **All operations**: Revoked from `anon` role entirely
  - Reason: Token verification must happen server-side (in SECURITY DEFINER functions); anon cannot read or modify

**Why Separate Table?**:
- Tokens are permanent (poster keeps edit access forever)
- Leases are temporary (10-minute window per edit session)
- Separating allows token to persist while lease expires without losing edit capability

---

### Table: `listing_reports`
**Purpose**: Audit trail and abuse tracking. One row per report.

| Column | Type | Constraints | Notes |
|--------|------|-----------|-------|
| `id` | uuid | PRIMARY KEY, default gen_random_uuid() | Report ID |
| `listing_id` | uuid | NOT NULL, FK → listings(id) ON DELETE CASCADE | Which listing was reported |
| `reason` | text | — | Optional freeform reason (max 300 chars after normalization); null if no reason given |
| `created_at` | timestamptz | NOT NULL, default now() | Report timestamp |

**Indexes**:
- `listing_reports_listing_idx`: ON (listing_id) — find all reports for a listing

**RLS Policies**:
- **All operations**: Revoked from `anon` role entirely
  - Reason: Inserts happen only via report_listing() RPC, which enforces rate-limit (1 per listing per day)

---

## RPC Reference (All SECURITY DEFINER, All Granted to anon)

All functions explicitly set `search_path = public, extensions` to handle pgcrypto safely.

### create_public_listing()
**Signature**:
```sql
create_public_listing(
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
```

**Purpose**: Posts a new listing and initializes its edit session.

**Validation**:
- `edit_token` must be ≥64 chars (enforced at creation to accept only cryptographically-generated tokens)
- `area`: trimmed, required, max 80 chars
- `block`: trimmed, required, max 80 chars (e.g., "5" or "Other")
- `type`: optional, one of {Apartment, Room, Partition, Bedspace}
- `description`: trimmed, required, max 1000 chars, normalized (see normalize_listing_description())
- `rent_kwd`: optional, 0–10000, precision 3 decimals, no negatives
- `whatsapp_e164`: required, E.164 regex `^\+[1-9][0-9]{5,14}$`

**Behavior**:
1. Insert listing row (auto-assigns UUID, created_at=now, expires_at=now+30 days)
2. Insert listing_edit_sessions row with token_hash = bcrypt(edit_token) and edit_lease_expires_at = now() + 2 minutes
3. Return listing + edit_expires_at for immediate UI feedback

**Caller-side**: Browser stores raw edit_token in localStorage; never sent again (only token_hash is on server)

---

### begin_public_listing_edit()
**Signature**:
```sql
begin_public_listing_edit(p_listing_id uuid, p_edit_token text)
returns timestamptz
```

**Purpose**: Opens a 10-minute edit window; caller must present the listing ID and their stored edit token.

**Behavior**:
1. Find listing_edit_sessions row where token_hash matches bcrypt(edit_token)
2. If found: UPDATE editing_started_at = now(), edit_lease_expires_at = now() + 10 minutes
3. Return new edit_lease_expires_at (for UI countdown timer)
4. If not found or token invalid: raise exception 'Invalid edit token'

**Why 2 min → 10 min window?**: First 2 minutes is a grace window (poster might refresh page, token retrieval may lag). Actual editing window is 10 minutes.

---

### update_public_listing()
**Signature**:
```sql
update_public_listing(
  p_listing_id uuid,
  p_edit_token text,
  p_area text,
  p_block text,
  p_type text,
  p_description text,
  p_rent_kwd numeric,
  p_whatsapp_e164 text
)
returns table (
  id uuid, area text, block text, type text, description text, rent_kwd numeric,
  whatsapp_e164 text, status text, created_at timestamptz, expires_at timestamptz
)
```

**Purpose**: Updates one or more fields of a listing, only if the token is valid AND the edit lease is active.

**Validation**: Same as create_public_listing (area, block, description, price, phone)

**Behavior**:
1. Validate all input fields
2. Normalize description
3. UPDATE listings row where:
   - listing_id matches
   - matching listing_edit_sessions row exists
   - edit_lease_expires_at > now() (lease still active)
   - token_hash = bcrypt(edit_token) (token valid)
4. If update succeeds: Close the lease (set edit_lease_expires_at = now(), editing_started_at = null) but do NOT delete row
5. Return updated listing
6. If no matching row or lease expired: raise 'The edit window has expired'

**Critical**: Does NOT reset expires_at; listing expiry remains 30 days from original post, regardless of edits.

---

### delete_public_listing()
**Signature**:
```sql
delete_public_listing(p_listing_id uuid, p_edit_token text)
returns boolean
```

**Purpose**: Permanently deletes a listing; no lease window required.

**Behavior**:
1. Verify token_hash matches bcrypt(edit_token) in listing_edit_sessions
2. If valid: DELETE from listings (cascades to listing_edit_sessions)
3. Return true
4. If invalid: raise 'Listing not found or token invalid'

**Why no lease?**: Deletes are destructive and immediate; poster shouldn't need a time window.

---

### report_listing()
**Signature**:
```sql
report_listing(p_listing_id uuid, p_reason text default null)
returns integer
```

**Purpose**: Files a report against a listing; auto-hides after 3 reports.

**Validation**:
- `reason`: optional, max 300 chars
- Listing must exist
- Rate-limit: Only 1 report per listing per UTC day (migration 20260829_001)

**Behavior**:
1. Check if listing exists (FOR UPDATE lock prevents concurrent race)
2. Check if a report for this listing already exists today; if so, raise exception
3. INSERT into listing_reports
4. UPDATE listings SET report_count = report_count + 1
5. If report_count ≥ 3: UPDATE listings SET status = 'reported' (auto-hides)
6. Return new report_count

**Double-layer anti-abuse**:
- Client-side: app.js stores reported IDs in localStorage; disables report button for 24 hours
- Server-side: RPC enforces 1 per listing per day + auto-hide at threshold
- Why two layers?: First stops accidental re-clicks; second stops coordinated abuse

---

### get_listing_for_owner()
**Signature**:
```sql
get_listing_for_owner(p_listing_id uuid, p_edit_token text)
returns table (
  id uuid, area text, block text, type text, description text, rent_kwd numeric,
  whatsapp_e164 text, status text, created_at timestamptz, expires_at timestamptz,
  report_count integer
)
```

**Purpose**: Allows the owner (token holder) to view their listing even if hidden or expired.

**Behavior**:
1. Verify token_hash = bcrypt(edit_token) in listing_edit_sessions
2. If valid: SELECT all columns from listings (bypasses RLS filters)
3. If invalid: raise exception
4. Return listing with report_count (not visible in public SELECT)

**Why SECURITY DEFINER bypass?**: RLS for anon role hides status='reported' and expired listings; owner needs to see these to understand why their listing isn't appearing.

---

### scrub_expired_listing_contact()
**Signature**:
```sql
scrub_expired_listing_contact()
returns void
```

**Purpose**: Deletes WhatsApp numbers from expired listings immediately (30 days post-posting).

**Behavior**:
- UPDATE listings SET whatsapp_e164 = null WHERE expires_at <= now() AND whatsapp_e164 IS NOT NULL

**Why separate from row deletion?**: Contact info is personally identifying; should be scrubbed sooner than full row retention.

---

### purge_expired_listings()
**Signature**:
```sql
purge_expired_listings()
returns void
```

**Purpose**: Batch cleanup job; call this daily or weekly.

**Behavior**:
1. Call scrub_expired_listing_contact()
2. DELETE from listing_edit_sessions where edit_lease_expires_at < now()
3. DELETE from listings where expires_at < now() - interval '7 days'

**Retention windows**:
- Listing row: 30 days active + 7 days metadata retention = 37 days total
- Contact number: 30 days (scrubbed immediately)
- Edit token: 37 days (deleted with listing)

---

## Write Path Architecture

```
Browser                    Supabase
  |                           |
  +-- form submission ------> RPC (security definer)
                               |
                          [Validate input]
                               |
                          [Verify token hash]
                               |
                          [Check lease window]
                               |
                          [INSERT/UPDATE/DELETE]
                               |
  <----- return row ----------+
  |
  store token in localStorage
  (never transmitted again)
```

**Key principle**: `anon` role has ZERO direct INSERT/UPDATE/DELETE grants on listings or listing_edit_sessions. All writes route through named RPCs, which enforce:
- Token validation (bcrypt comparison)
- Business logic (lease expiry, report threshold)
- Input constraints (length, format, range)
- Audit readability (reason field, timestamps)

---

## Read Path & RLS

**Public SELECT** on listings (from anon role):
```sql
SELECT * FROM listings WHERE status = 'active' AND expires_at > now()
```

**No direct SELECT** on listing_edit_sessions or listing_reports (anon has no grant).

**Owner SELECT** via get_listing_for_owner() RPC (SECURITY DEFINER):
- Bypasses RLS to show owner their own listing regardless of status or expiry

---

## Known Caveats & Production Gotchas

### 1. pgcrypto / search_path Issue
**Problem**: When a SECURITY DEFINER function uses `crypt()` (from pgcrypto extension), if search_path is not explicitly set, PostgreSQL may look for `crypt` in the wrong schema.

**Solution**: All functions now explicitly set `set search_path = public, extensions` in their definition.

**Why it matters**: A function without this setting may fail silently or raise schema-not-found errors in production.

**Status**: Fixed in migration 20260830_005.

---

### 2. UptimeRobot & Supabase Auto-Pause
**Problem**: Supabase free tier auto-pauses the database after 7 days of inactivity. UptimeRobot (free uptime monitor) can't authenticate to Supabase.

**Workaround** (current): UptimeRobot pings `/purge-listings` endpoint (not in repo; deployed separately) with API key as query parameter. Endpoint calls `purge_expired_listings()` RPC to keep DB alive.

**Fragility**: Query-param auth is not ideal (visible in logs), but free-tier Supabase has no webhook ingestion.

**Future**: Deploy scheduled job (AWS Lambda, Netlify Function, or pg_cron on paid Supabase tier) to call `purge_expired_listings()` daily.

---

### 3. Report Threshold & False Positives
**Current**: 3 reports = auto-hide.

**Rationale**: On a no-login, no-reputation board, false positives are cheaper than slow takedown. A wrongly-hidden listing costs the poster 1 repost. A scam listing staying up for days costs multiple searchers trust in the platform.

**Trade-off**: If abuse volume grows, threshold may need tuning.

---

### 4. Lack of IP-Based Rate Limiting
**Reason**: Supabase RPCs don't expose client IP reliably; storing IPs would require audit logging.

**Mitigation**: Two-layer report dedup (client-side localStorage + server-side 1-per-day check) + low report threshold.

**Risk**: Coordinated abuse (e.g., 10 accounts reporting the same listing on different days) can still happen. Acceptable risk at launch.

---

### 5. Token Hash Permanence
**Design**: token_hash row is never deleted, even after lease expires.

**Why**: Poster needs permanent proof of ownership; re-editing re-opens a new lease without needing a password reset or account recovery.

**Risk**: If a token is leaked, attacker has permanent access. Mitigation: tokens are 64+ chars (8 bytes of entropy), stored locally in browser, never transmitted after creation.

---

## Deployment & Migrations

### Frontend Deployment
- GitHub → Netlify auto-deploy
- No build step; static assets served from Netlify CDN

### Backend Deployment
**Schema & migrations** are versioned in `migrations/` folder:
- `20260829_001_limit_public_listing_reports.sql` — 1-per-day report rate-limit
- `20260829_002_enforce_public_listing_edit_lease.sql` — Lease expiry check
- `20260829_003_validate_public_listing_input.sql` — Input validation helper + description normalization
- `20260830_004_scrub_expired_listing_contact.sql` — Contact scrubbing function
- `20260830_005_harden_function_privileges.sql` — search_path fix + authenticated role revoke

**Deployment method** (current): Manual via Supabase dashboard SQL editor.

**Risk**: Applying migrations out of order or re-running partial migrations can cause inconsistency (e.g., functions with old signatures coexisting).

**Best practice**: Always run migrations in timestamp order; never revert without reviewing dependent objects.

---

## Hosting & Infrastructure

| Layer | Provider | Tier | Limits |
|-------|----------|------|--------|
| Frontend | Netlify | Free | 300 min/month build, unlimited bandwidth |
| Backend DB | Supabase | Free | 500MB storage, 2GB/month egress, auto-pause after 7 days |
| Auth | Supabase (JWT-less) | N/A | anon role, no token expiry needed |
| Cron | Manual (UptimeRobot) | Free | 1 check every 5 min; not reliable |

**Scaling bottlenecks** (if traffic grows):
1. **Database**: Free tier max 500MB; listing table with 10,000+ listings + report audit trail may exceed
2. **Egress**: 2GB/month covers ~10K searchers × 10KB/search; tight
3. **Auto-pause**: Unreliable for a living board; move to paid Supabase or self-hosted Postgres

---

## Version Control & Schema History

- **Current schema**: `/schema.sql` (complete initial + all migrations inlined)
- **Migration history**: `/migrations/*.sql` (incremental changes, versioned by date + sequence)

When updating schema:
1. Write new migration file: `20250909_NNN_describe_change.sql`
2. Apply to database (via Supabase dashboard)
3. Test all RPCs (verify search_path, token validation, lease expiry)
4. Commit to git
5. Document in this file (ARCHITECTURE.md)

---

## Summary: Why This Stack

- **No accounts**: Minimizes auth surface, compliance burden, and privacy risk
- **RPC-only writes**: Single authorization layer (token validation), audit trail (report reasons), atomic operations
- **Token-based edit**: Poster owns their listing without passwords; token loss = permanent loss (acceptable trade-off)
- **30-day expiry**: Keeps board fresh; auto-repost simple (paste new token)
- **3-report threshold**: Balances speed (spam gone in hours) vs. false positives (low cost to repost)
- **Supabase free tier**: Zero ops, auto-scaling within limits, RLS built-in
- **Static frontend**: No server-side logic, CDN cacheable, Netlify free tier sufficient

