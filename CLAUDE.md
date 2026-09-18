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

## Long-Running Operations & Context Continuity

**Problem**: Multi-step tasks (>7 steps) spanning multiple agent sessions often result in:
- Contradictory decisions (agent A made choice X, agent B contradicts it)
- Forgotten constraints (later steps ignore earlier decisions)
- Drift from original intent (goals shift as context is lost)
- Wasted cycles (work undone because new agent wasn't aware of it)

**Solution**: Use structured context continuity for complex work.

### 1. Project State File (Traveling Context)

Before starting any task longer than 7 steps, create a `PROJECT_STATE.md` file in the repo root:

```markdown
# PROJECT_STATE.md
**Last Updated**: 2026-09-18 14:30 UTC  
**Current Phase**: Feature: Add Bedroom Count to Listings  
**Session ID**: abc123xyz  

## Completed Steps
- [x] Step 1: Read schema.sql and understand listings table structure
- [x] Step 2: Identified 3 existing migrations as patterns to follow
- [x] Step 3: Wrote migration 20260918_009_add_bedroom_count.sql

## In Progress
- [ ] Step 4: Update RPC create_public_listing() to accept bedroom_count parameter
- [ ] Step 5: Test RPC with real Supabase instance
- [ ] Step 6: Update app.js form to collect bedroom_count

## Blocked / On Hold
- None currently

## Key Decisions Made
- Bedroom count stored as INT (not ENUM, to allow flexibility)
- Made optional field (not required in form, nullable in DB)
- No schema change to existing records (backward compatible)

## Constraints
- Cannot break existing listings or edit tokens
- Must maintain RLS policies (anon still read-only)
- No breaking changes to edit_listing() RPC
- Must test before deploy

## Risks / Open Questions
- Should default value be NULL or 0? → DECIDED: NULL (means not specified)
- Should we validate range (1-10 bedrooms)? → DECIDED: Yes, in RPC validation
- Does this require migration notification to users? → TBD

## Next Agent's Checklist
1. Read this file in full before starting work
2. Verify all "Completed" items by spot-checking code (don't trust the checkbox)
3. Pick up where the previous agent left off (Step 4)
4. Update this file after EACH step (Completed or In Progress)
5. If you hit a blocker, update "Blocked" and stop — don't guess
6. If you find a contradiction in earlier decisions, flag it in "Open Questions" before proceeding
```

**Usage Rules**:
- Create PROJECT_STATE.md at task start
- Update it after EVERY step (not just at chunk end)
- Pass it to the next agent at the start of every new session
- If you're working on a task, the file is your source of truth, not your memory
- Keep it concise (< 200 lines); link to detailed docs if needed

---

### 2. Task Decomposition Before Execution

**Rule**: Never run a task with >7 steps as a single operation. Break it into chunks.

**Chunking Strategy**:

| Complexity | Chunk Size | Pattern | Example |
|-----------|-----------|---------|---------|
| Small (1-7 steps) | All at once | Single session | "Fix typo in error message" |
| Medium (8-21 steps) | 5-7 steps per chunk | 3-4 sessions | "Add bedroom_count field to listings" |
| Large (22+ steps) | 5-7 steps per chunk | 5+ sessions | "Redesign entire post flow with validation" |

**Example: Medium Task Breakdown**

**Task**: "Add bedroom_count field to listings table"

**Full step list** (15 steps):
1. Read schema.sql
2. Review existing migrations (pattern matching)
3. Write new migration file
4. Update RPC create_public_listing() signature
5. Add server-side validation in RPC
6. Test RPC against real Supabase
7. Update RPC get_listings() to return bedroom_count
8. Update app.js form (add input field)
9. Update renderListingCards() to display bedroom_count
10. Update renderMyListings() to show bedroom_count in owner view
11. Test full flow: post → search → view
12. Test edit flow: load existing listing → edit bedroom_count
13. Verify RLS still works (anon can't write directly)
14. Write migration rollback plan (just in case)
15. Commit and document changes

**Chunked into 3 sessions**:

**Chunk 1** (Steps 1-5, ~45 min):
- Read schema.sql
- Review migration patterns
- Write new migration
- Update create_public_listing() signature
- Add validation

**Chunk 2** (Steps 6-10, ~60 min):
- Test RPC on real Supabase
- Update get_listings() RPC
- Add form input field in HTML
- Update display functions (renderListingCards, renderMyListings)

**Chunk 3** (Steps 11-15, ~45 min):
- Test post → search → view flow
- Test edit flow
- Verify RLS hasn't been broken
- Write rollback plan
- Commit with detailed message

**Why this works**:
- Each chunk is standalone (can be paused/resumed without losing context)
- Agent never drifts far (5-7 steps is manageable in one session)
- STATE file captures what happened, so next agent doesn't re-discover things
- Natural stopping points for review and validation

---

### 3. Validation Checkpoint Between Chunks

**Rule**: After each chunk completes, pause and present a summary for human review before proceeding to the next chunk.

**Checkpoint Ceremony** (5 steps):

**Step 1: Summarize What Was Done**
```
✅ Chunk 1 Complete (Steps 1-5/15)

Files Modified:
- migrations/20260918_009_add_bedroom_count.sql (created)
- schema.sql (snapshot updated)
- db/functions/ (create_public_listing() RPC updated)

Changes Made:
- ALTER TABLE listings ADD COLUMN bedroom_count INT
- Updated create_public_listing() to accept bedroom_count parameter
- Added validation: 1-10 range, NULL allowed
- RPC tested on staging Supabase (12 test cases passed)

Code Quality:
- All existing tests still pass
- No migration syntax errors (verified with psql --dry-run)
- RLS policies unchanged (anon still read-only)
```

**Step 2: List What's Ready to Review**
```
📋 Code Review Ready:
1. Migration file at migrations/20260918_009_add_bedroom_count.sql
2. RPC implementation at [db/functions#L...](...)
3. Test results (log output included)
```

**Step 3: Flag Any Issues or Decisions**
```
⚠️ Decisions Made (need approval before continuing):
- Default bedroom_count = NULL (not 0)
- Validation range: 1-10 bedrooms (reject invalid input)

❓ Open Questions for You:
- Should we send a notification when users view this field?
- Should we add a migration rollback test?
```

**Step 4: Present Next Steps (Preview)**
```
→ Chunk 2 Preview (Steps 6-10):
- Update get_listings() RPC to return bedroom_count
- Add <input type="number"> field to post form
- Update listing display cards to show bedroom count
- Estimated time: 60 minutes
```

**Step 5: Wait for Approval**
```
✋ **PAUSED** — Ready for your review.

Please:
1. Review the code changes (links above)
2. Approve or request changes to decisions
3. Say "continue" when ready for Chunk 2
```

**Why this pattern works**:
- Human sees progress (not a black box)
- Issues are caught early (before they compound)
- Decisions are explicitly approved (no second-guessing later)
- Next chunk can adjust based on feedback

---

### 4. Agent Instructions for Long Operations

**When you receive a task:**

1. **Check for PROJECT_STATE.md**
   - If it exists → read it in full first, then pick up where you left off
   - If it doesn't exist → create one before starting

2. **Count the steps**
   - If ≤7 steps → proceed as one session
   - If >7 steps → break into chunks of 5-7, create STATE file, execute chunk 1 only

3. **After each chunk:**
   - Update PROJECT_STATE.md with what was completed
   - Present the checkpoint ceremony (summary + decisions + preview)
   - **STOP** — do not automatically proceed to next chunk
   - Wait for human approval before continuing

4. **If you find contradictions:**
   - Check PROJECT_STATE.md to see what was decided earlier
   - If the earlier decision seems wrong, flag it in "Open Questions" (don't override)
   - If it's a true bug, ask before proceeding

5. **If you get stuck:**
   - Update PROJECT_STATE.md with what failed and why
   - Move it to "Blocked" section
   - Present a summary and stop
   - Don't guess or try workarounds

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
