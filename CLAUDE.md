# CLAUDE.md — Operating Manual for AI Agents in Kwetu Kuwait

**This file defines how any AI agent (including Claude, future Copilot integrations, or other tools) should approach work in this repository.**

---

## Core Directive

This is a **live production system** serving the African expatriate community in Kuwait. It handles real listings, real WhatsApp contacts, and real trust. **Never guess. Always read the actual code first.**

---

## Before You Start Any Task

### 1. Get Full Context — Don't Assume
- **Always ask for or search for the actual files** before proposing changes
- Do not infer schema from file names or comments — read `schema.sql` in full
- Do not assume function behavior from their names — read `app.js` RPC calls in full
- Do not guess at RLS policies — read the ARCHITECTURE.md section on policies
- **If files are referenced but not provided**, ask for them explicitly: *"I need to see schema.sql, app.js, and the migrations folder to understand the write path. Can you provide them?"*

### 2. Understand the Golden Rule
- **No anon role writes directly to tables. All writes go through named RPCs.**
- Any suggestion that bypasses this (e.g., "let anon INSERT directly into listings") is a security bug.
- If you encounter code that seems to violate this, flag it as a bug and ask before proceeding.

### 3. Read Architecture-Essentials First
- Before touching *any* code, skim [ARCHITECTURE-ESSENTIALS.md](ARCHITECTURE-ESSENTIALS.md)
- This file lists the 8 iron-clad rules that cause real bugs if forgotten
- If a task requires a schema or RPC change, read full [ARCHITECTURE.md](ARCHITECTURE.md) section on that component

---

## Task Categories & Guidance

### A. Documentation-Only Tasks
**Allowed**: Create PRD.md, ARCHITECTURE.md, CLAUDE.md, or other `.md` files that document existing behavior.

**Forbidden**: Edit any `.js`, `.html`, `.css`, or `.sql` files.

**Approach**:
1. Read all code files fully
2. Derive documentation from actual behavior, not assumptions
3. Note contradictions (e.g., comment says X, but code does Y) — document the code, not the comment
4. Explain *why* decisions were made (e.g., "3-report threshold is low intentionally because false positives cost less than slow takedowns")

**Before submitting**: Verify each claim against the code. Use direct quotes or line numbers.

---

### B. Bug Fixes (Zero Changes to Schema or RPC Signatures)
**Allowed**: Fix logic errors, typos, or performance issues *within existing function bodies and UI code*, assuming the signature doesn't change.

**Forbidden**: Rename parameters, change return types, or split a function without confirming all call sites.

**Approach**:
1. Locate the bug (grep, file search, or semantic search)
2. Read the full function + all callers (use vscode_listCodeUsages)
3. Understand the fix's impact on RLS, edit tokens, lease windows, or report logic
4. Make the minimal change; test the full flow (post → edit → report → view as owner)
5. If the bug is in a migration, read the migration's purpose first (what was it fixing?)

**Example**: If `report_listing()` has a typo in the rate-limit check, fix it — but verify that `app.js` doesn't rely on the buggy behavior.

---

### C. Feature Additions Within Existing Architecture
**Allowed**: Add optional fields to listings (e.g., `bedroom_count`), add new RPC functions (e.g., `get_listings_by_type`), or extend RLS policies.

**Forbidden**: Change the write path (e.g., "let anon update report_count directly"), change token system (e.g., "add JWT expiry"), or remove auto-expiry.

**Approach**:
1. Check if the feature would break ARCHITECTURE-ESSENTIALS rules 1–8
2. If it requires a schema change: write a new migration file (don't edit old ones), with clear comments on why
3. If it requires a new RPC: include full input validation, `search_path` setting, and RLS implications
4. If it requires RLS changes: verify that anon still cannot write directly to tables
5. Create a test case (e.g., "post listing with bedroom_count=3, verify fetch returns it")
6. Do NOT re-run old migrations; apply the new one in isolation

**Example**: Adding `bedroom_count INT` to listings:
- Write migration `20250909_006_add_bedroom_count.sql`
- Include `ALTER TABLE listings ADD COLUMN bedroom_count INT` (safe, non-breaking)
- Update RPC signatures in the same migration if they return the column
- Update `schema.sql` to reflect the final state
- Test: post, fetch, edit — all should include bedroom_count

---

### D. UI/UX Changes (Frontend Only)
**Allowed**: Change HTML layout, CSS styling, or JavaScript UX flow without modifying RPC calls or schema.

**Forbidden**: Change RPC names or signatures; change how tokens are generated or stored; change the edit-lease or report-threshold logic.

**Approach**:
1. Read the full flow in `app.js` (how it currently calls RPCs, handles tokens, manages UI state)
2. Make changes to `index.html`, `css/style.css`, or `js/app.js` UI handlers
3. Verify that RPC calls and parameters are unchanged
4. Test on a real Supabase instance (dev or staging) if possible
5. If you must change RPC parameter names, flag it as a breaking change and ask first

**Example**: Changing the "Post a room" button color or adding a success toast — fine. Changing the report-threshold from 3 to 5 without asking — not fine.

---

### E. Security or Compliance Issues
**Allowed**: Flag, investigate, and fix vulnerabilities (e.g., missing input validation, XSS in description rendering).

**Approach**:
1. Describe the vulnerability clearly (e.g., "Description field is rendered without escaping; XSS risk")
2. Propose a minimal fix (e.g., "Add `escapeHtml()` in renderListingCards()")
3. Verify the fix doesn't break legitimate use cases (e.g., hyphens, quotes, emoji in descriptions)
4. Test the fix against the actual Supabase instance
5. Document the vulnerability and fix in ARCHITECTURE.md under a new "Security Fixes" section

---

## Common Pitfalls & How to Avoid Them

### Pitfall 1: Assuming RLS Behavior Without Reading Policies
**What happens**: Suggest a "small" change that accidentally opens a read/write hole for anon role.
**Prevention**: Always grep for `create policy` and read each one in full. Understand which role gets which permission on which table.

### Pitfall 2: Re-Running Migrations
**What happens**: You apply a migration twice; the second run finds a function with the new signature and creates a duplicate or fails.
**Prevention**: Migrations are one-time events. If you need to undo a migration, write a new one (e.g., `20250910_007_rollback_previous_change.sql`). Never re-apply an old migration without checking if its effects already exist.

### Pitfall 3: Editing schema.sql Instead of Writing a Migration
**What happens**: You change schema.sql to add a column, but Supabase production doesn't get the change until someone manually runs it.
**Prevention**: New features go in new migration files. schema.sql is a snapshot; migrations are the source of truth for what's deployed.

### Pitfall 4: Changing Function Signatures Without Checking Call Sites
**What happens**: You rename a parameter in an RPC; app.js still calls it with the old name; all writes fail in production.
**Prevention**: Use `vscode_listCodeUsages` to find every call site before changing a signature. If there are callers outside your control (e.g., mobile apps, external integrations), ask about backward compatibility.

### Pitfall 5: Forgetting search_path in a SECURITY DEFINER Function
**What happens**: Function fails silently or in production when pgcrypto isn't found.
**Prevention**: Copy-paste the header from an existing RPC: `language plpgsql security definer set search_path = public, extensions as $$`

### Pitfall 6: Deleting the listing_edit_sessions Row
**What happens**: Poster loses permanent access to their listing, even with the correct token.
**Prevention**: Never delete or truncate listing_edit_sessions. The token_hash row persists for the lifetime of the listing.

### Pitfall 7: Resetting expires_at on Edit
**What happens**: Board fills with old listings because posters keep re-editing to stay near the top.
**Prevention**: Leave expires_at alone; only update description/price/contact. If you're adding a "bump" feature, make it explicit (e.g., "Renew this listing for another 30 days?") with a separate RPC and charges.

---

## When to Ask Before Proceeding

Stop and ask if:
1. **You're changing the write path**: "Should anon be able to X?" → ask first
2. **You're changing RPC signatures**: "I need to rename a parameter. Will this break anything?" → ask first
3. **You're re-running a migration**: "Is it safe to re-apply migration N?" → ask first
4. **You're adding paid features**: "Should users pay to delete listings?" → ask first (likely out of scope)
5. **You're collecting new data**: "Should we store browser fingerprints for abuse detection?" → ask first (privacy risk)
6. **You're unsure about a rule**: Re-read ARCHITECTURE-ESSENTIALS; if still unsure, ask

---

## Communication Guidelines

### When Reporting a Problem
- **What**: Describe the bug or issue clearly (e.g., "Report button doesn't disable after 3 reports")
- **Where**: Include file name and line number (e.g., `app.js:250`)
- **Why**: Explain the impact (e.g., "Same listing can be hidden 3 times by one user if report state isn't persisted")
- **How**: Propose a fix or ask for guidance

### When Proposing a Change
- **Current behavior**: Explain what the code does now
- **Desired behavior**: Explain what it should do instead
- **Why it matters**: Link to a real user need or bug
- **Implementation plan**: Outline the steps (schema, RPC, UI, tests)
- **Risk**: Flag any potential breaking changes or gotchas

### When Uncertain
- Describe what you've read and what you're still unsure about
- Ask a specific question, not a vague one
  - ❌ "Is this okay?" 
  - ✅ "Should I add `search_path` to the new RPC, or does it inherit it from the table?"

---

## Operational Constraints

### Do Not
- Scrape competing platforms (rental sites, roommate groups) for listings or pricing data — ruled out on legal/strategic grounds
- Modify deployed migrations in the `migrations/` folder — write new ones instead
- Commit untested changes to main; use a staging environment or branch
- Share API keys, database credentials, or Supabase project URLs in documentation or commits
- Process or store payment information (out of scope)
- Collect or store personally-identifying information beyond area, block, and WhatsApp number

### Do
- Keep edit tokens in browser localStorage; never send to any API
- Validate all RPC inputs server-side (client-side validation is UX only)
- Use SECURITY DEFINER functions for all writes (not direct RLS grants to anon)
- Test migrations on a non-production Supabase project first
- Document schema changes in a new `.md` file or in ARCHITECTURE.md
- Keep the codebase vanilla (no npm dependencies for frontend, if possible)

---

## Testing Checklist (Before Submission)

- [ ] Ran the new/changed code against actual Supabase instance (dev or test project)
- [ ] Verified that edit tokens are stored in browser localStorage, not sent to API
- [ ] Confirmed that all RPC calls include valid tokens and check for lease/rate-limits
- [ ] Checked that RLS policies still enforce `status = 'active' AND expires_at > now()` for anon SELECT
- [ ] Verified that owners can see their own listings even if hidden or expired (via `get_listing_for_owner`)
- [ ] Tested the full flow: post → search → edit → report → delete
- [ ] Checked migration syntax (no syntax errors, idempotent `CREATE OR REPLACE` or `CREATE IF NOT EXISTS`)
- [ ] Confirmed no secrets (API keys, db URLs) are in code files

---

## Escalation Path

If you encounter:
1. **Schema corruption** (e.g., function doesn't exist, migration failed midway) → Snapshot the DB; ask for a restore from backup
2. **Security vulnerability** (e.g., XSS, SQL injection) → Flag immediately; do not merge or deploy
3. **Conflict with Kwetu's legal/business model** (e.g., "Should we charge for posts?") → Ask before proceeding; likely needs founder decision
4. **Task unclear or contradicts earlier guidance** → Ask for clarification; don't guess

---

## Summary

**You are trusted to work autonomously on this codebase. Use that trust by:**
1. Reading the code before proposing changes
2. Following the 8 iron-clad rules in ARCHITECTURE-ESSENTIALS
3. Asking questions before making risky changes
4. Testing on a real Supabase instance (dev/staging)
5. Documenting decisions in code comments or markdown files
6. Keeping the repo secure (no secrets, no data scraping, no unauthorized changes)

**If you're unsure, ask. If you break something, tell us immediately. If you're about to delete or rename something, triple-check the call sites.**

---

## Quick Reference

| File | Read When |
|------|-----------|
| [ARCHITECTURE-ESSENTIALS.md](ARCHITECTURE-ESSENTIALS.md) | Before *any* code change |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Before schema/RPC changes |
| [PRD.md](PRD.md) | Before product/UX changes |
| [schema.sql](schema.sql) | Before anything (source of truth) |
| [js/app.js](js/app.js) | Before frontend changes |
| [js/supabase-client.js](js/supabase-client.js) | Before RPC signature changes |
| migrations/*.sql | Before applying database changes |

Good luck. Welcome to Kwetu Kuwait.
