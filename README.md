Kwetu Kuwait

A community housing platform for the African diaspora in Kuwait — helping people find rooms, apartments, partitions, and roommates.

Project of the Flowtwchnologies company.

What this is

Kwetu Kuwait is a simple, area-first housing board. Post a room, browse by area, contact people directly on WhatsApp. No sign-up, no login, no password to remember.

Core design principles
- No login required — anyone can post or browse instantly.
- Area-first navigation — Kuwait's areas are the primary way people think about housing, so the site is structured around them first, not a generic search bar.
- WhatsApp as the primary contact method — the platform never handles messaging itself; it hands off to WhatsApp via wa.me deep links.
- Self-healing content — listings expire automatically after 30 days via query-time filtering; the WhatsApp number is hard-deleted at that same 30-day mark, and the rest of the listing row is purged 7 days after that. No admin panel needed to keep the board fresh.
Tech stack
| Layer | Tech |
| --- | --- |
| Frontend | Vanilla HTML / CSS / JavaScript (no framework) |
| Backend | Supabase (Postgres + Row Level Security) |
| Fonts | Space Grotesk, Work Sans, IBM Plex Mono |

Project structure
```
kwetu-kuwait/
├── index.html              # Site structure and markup (the app itself)
├── terms.html               # Terms of Service (standalone legal page)
├── privacy.html              # Privacy Policy (standalone legal page)
├── css/
│   └── style.css            # Styling — Gulf teal & desert amber design system
├── js/
│   ├── app.js                # Interactivity: navigation, forms, search, listings
│   └── supabase-client.js    # Connects to Supabase; wraps every RPC call
├── schema.sql                 # Baseline database schema + RLS policies + RPCs
└── migrations/                 # Standalone, sequenced SQL changes applied after schema.sql
```

How the backend works

Supabase provides a hosted Postgres database with an auto-generated REST API. The frontend talks to it exclusively through `js/supabase-client.js`.

The public API key committed in this repo is a publishable key (`sb_publishable_...`), which is designed to be safely exposed in client-side code. Actual protection is enforced at the database level via Row Level Security (RLS) plus a set of `security definer` RPCs — anon has no direct insert/update/delete grant on `listings`, only on these functions:

- `create_public_listing(...)` — creates a listing and a matching row in `listing_edit_sessions`, returning an edit token (never stored in plain text — only its hash is).
- `begin_public_listing_edit(id, token)` — opens a 10-minute edit lease on a listing the caller already has the token for.
- `update_public_listing(...)` — only succeeds while that lease is open and the token matches; enforced entirely inside the function, not just client-side.
- `get_listing_for_owner(id, token)` — lets a poster with the matching edit token see their own listing even if it's `'reported'` or expired, which the public select policy otherwise hides. Powers the My Listings page.
- `delete_public_listing(id, token)` — deletes a listing given its permanent edit token. No open edit lease required.
- `report_listing(id, reason?)` — the only writer of `listing_reports` and `listings.report_count`.

RLS policies limit public reads to `status = 'active' and expires_at > now()`, so the 30-day expiry isn't a background job — it's simply part of what's considered "visible."

Abuse prevention (server-side)

These are enforced in Postgres, not just in the browser, so they can't be bypassed by calling the Supabase API directly:
- **Report throttling** — `migrations/20260829_001_limit_public_listing_reports.sql` limits accepted reports to one per listing per day. True IP-based rate limiting isn't used: Supabase RPCs don't receive a trustworthy client IP, and storing one would mean adding audit/IP logging, which this project deliberately avoids. Client-side `localStorage` dedup still exists in `app.js`, but only as a UX nicety against accidental double-taps.
- **Edit window** — `migrations/20260829_002_enforce_public_listing_edit_lease.sql` reasserts that `update_public_listing()` only succeeds while `listing_edit_sessions.edit_lease_expires_at > now()` and the token hash matches. This was already true in `schema.sql`; the migration exists so it's explicit and re-verifiable on its own.
- **Input validation & normalization** — `migrations/20260829_003_validate_public_listing_input.sql` adds a shared `validate_public_listing_input()` helper (area/block/description length, a 10,000 KWD rent ceiling, WhatsApp E.164 format) and a `normalize_listing_description()` helper that collapses runs of spaces/tabs and caps blank-line runs at one, while preserving single line breaks.
- **Stored-XSS defense on the frontend** — `js/app.js` HTML-escapes every listing field (`area`, `block`, `type`, `description`, `whatsapp_e164`) before inserting it into the DOM, since listing content is rendered via `innerHTML`.

Explicitly **not** implemented (by design, for now): CAPTCHA, IP/timestamp audit logging, optimistic-UI rollback. Flag these as separate future asks if they're needed later.

Applying migrations

`schema.sql` is the baseline — it is not edited in place for these changes. Everything under `migrations/` is standalone, sequenced SQL (filenames sort in application order) meant to be pasted into Supabase's SQL editor, or run via any Postgres migration runner, after the base schema is already deployed.

🚧 Actively in development.

My Listings, editing, and deleting
- `#my-listings` (a real page, same pattern as Post/Search) lists everything this browser has posted, read from the `kwetu_edit_tokens_v1` localStorage map the post flow writes to — `{ [listingId]: editToken }`. There's still no account system; "yours" means "this browser has the token for it."
- The edit token is permanent — it's never deleted after first use, so the same browser can open more edit sessions, or delete the listing, at any time later.
- `get_listing_for_owner(p_listing_id, p_edit_token)` is a `security definer` RPC that fetches a listing for a poster with the matching edit token even if the public RLS select policy would otherwise hide it (status `'reported'`, or past `expires_at`) — it's the only way My Listings can show what actually happened to a listing instead of it just silently vanishing.
- Editing reuses the existing Post page/form/review-veil wholesale — `handleEditClick()` opens a fresh 10-minute lease via `begin_public_listing_edit()`, pre-fills every field, and the same "Confirm" button calls `update_public_listing()` instead of `create_public_listing()`.
- Deleting calls `delete_public_listing(p_listing_id, p_edit_token)` behind a confirm step; no edit lease is required for a delete.
- If the browser's local listing token is lost, the listing has no self-service recovery path; support staff edit it manually in the database.

Reporting a listing
- `report_listing(p_listing_id, p_reason?)` is a `security definer` RPC — anon has no direct write access to `listing_reports` or to `listings.report_count`, this function is the only path.
- Each call inserts one audit row into `listing_reports` and increments `listings.report_count`, throttled server-side to one accepted report per listing per day (see Abuse prevention above). At 3 reports the listing's `status` flips to `'reported'`, which the existing RLS select policy already excludes from public reads — no separate moderation UI needed for the common case.
- The threshold is deliberately low: a false positive just means a legitimate poster republishes, while slow takedown of an abusive listing is the costlier failure mode on a no-login board.
- Client-side, `app.js` remembers reported listing IDs in `localStorage` so the same browser can't spam the button — this stops accidental double-taps, not a determined abuser; the server-side daily throttle is what stops the multi-device case.

Roadmap
- [ ] Revisit the "expat"-tier area list periodically — it's inferred from rental-portal inventory (Boshamlan/Bayut/Dare/Hilite), not an official register, since Kuwait doesn't publish one.
- [ ] CAPTCHA on posting/reporting — deliberately deferred, not yet needed at current traffic.
- [ ] Audit logging (IP/timestamp) — deliberately deferred; would need a clear privacy-policy update first.
- [ ] Optimistic-UI rollback for failed writes — deliberately deferred.

