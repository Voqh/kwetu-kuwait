Kwetu Kuwait

A community housing platform for the African diaspora in Kuwait — helping people find rooms, apartment partitions, and roommates by area, without accounts or friction.

Part of the Pamoja Afrika network.

What this is

Kwetu Kuwait is a simple, area-first housing board. Post a room, browse by area, contact people directly on WhatsApp. No sign-up, no login, no password to remember.

Core design principles
No login required — anyone can post or browse instantly.
Area-first navigation — Kuwait's areas are the primary way people think about housing, so the site is structured around them first, not a generic search bar.
WhatsApp as the primary contact method — the platform never handles messaging itself; it hands off to WhatsApp via wa.me deep links.
Self-healing content — listings expire automatically after 30 days via query-time filtering. No scheduled cleanup jobs, no admin panel needed to keep the board fresh.
Tech stack
Layer	Tech
Frontend	Vanilla HTML / CSS / JavaScript (no framework)
Backend	Supabase (Postgres + Row Level Security)
Fonts	Space Grotesk, Work Sans, IBM Plex Mono
Project structure
kwetu-kuwait/
├── index.html          # Site structure and markup
├── css/
│   └── style.css       # Styling — Gulf teal & desert amber design system
├── app.js               # Interactivity: navigation, forms, scroll effects
├── supabase-client.js   # Connects to Supabase; exposes createListing(), fetchActiveListings(), fetchAreaCounts()
└── schema.sql            # Database schema + Row Level Security policies
How the backend works

Supabase provides a hosted Postgres database with an auto-generated REST API. The frontend talks to it exclusively through supabase-client.js.

The public API key committed in this repo is a publishable key (sb_publishable_...), which is designed to be safely exposed in client-side code. Actual protection is enforced at the database level via Row Level Security (RLS):

Anonymous insert — anyone can create a new listing, no login needed.
Active-and-non-expired select — anyone can read listings, but only ones marked active and less than 30 days old.

This means the 30-day expiry isn't a background job — it's simply part of what the RLS policy considers "visible," so old listings quietly stop appearing without any cleanup process.

Getting started (local development)
Clone this repo.
Open index.html directly in a browser, or serve the folder with any static file server.
Supabase credentials are already wired in supabase-client.js. If you're setting up your own Supabase project, run schema.sql in the Supabase SQL editor first, then swap in your own project URL and publishable key.
Status

🚧 Actively in development. Not yet deployed to a public URL.

Roadmap
 Deploy to a live public URL
 Phone number validation and WhatsApp deep-link handling
 Finalize status field design (drives both expiry and reporting)
 Finalize country-code handling for WhatsApp links (used to construct wa.me links, not stored)
 Source real PACI/Municipality block-level geodata — the area-centroid distance check in app.js (AREA_CENTROIDS) is a rough neighbourhood-level sanity check only, not verified block boundaries. Replacing it with real polygons is the main remaining gap in the location feature.
 Revisit the "expat"-tier area list periodically — it's inferred from rental-portal inventory (Boshamlan/Bayut/Dare/Hilite), not an official register, since Kuwait doesn't publish one.
 Consider a lightweight CAPTCHA or rate limit on report_listing() — dedup today is client-side (localStorage) only, so a determined abuser could still inflate report_count from multiple devices.
 Apply `migration_2026-08-22_my_listings.sql` to the live Supabase project — `schema.sql` already reflects it for fresh deploys, but the running database needs the one-time migration run manually in the SQL editor.
 A browser that clears localStorage (or a new device) loses access to its own listings entirely — there's no recovery path since there's no account system. Worth a "save this link" reminder somewhere in the post-publish flow.
License

TBD.

Recommendations
- **Server-side edit-window enforcement:** The client shows a 2-minute edit window; enforce this in Postgres/RLS or a Postgres function so updates after the window are rejected server-side.
- **Row-Level Security & least privilege:** Keep insert/select/update policies tight. Use JWT claims or a short-lived edit token to allow edits only for the allowed timeframe.
- **Input validation on server:** Validate phone numbers, rent numeric ranges, and sanitize descriptions server-side to prevent injection or malformed data.
- **Optimistic UI + rollback:** Apply optimistic updates on the client for a snappy UX, but rollback if the server returns an error.
- **Rate limiting & abuse prevention:** Consider server-side rate limits or a lightweight CAPTCHA for anonymous posting to avoid spam.
- **Use HTTPS & secrets handling:** Never expose service role keys on the client. Keep only publishable keys in the frontend; move sensitive actions to server-side functions.
- **Audit logging:** Store who created/edited a listing (IP, timestamp) to help abuse investigations and to enforce edit windows reliably.

My Listings, editing, and deleting
- `#my-listings` (a real page, same pattern as Post/Search) lists everything this browser has posted, read from the same `kwetu_edit_tokens_v1` localStorage map the post flow already writes to — `{ [listingId]: editToken }`. There's still no account system; "yours" means "this browser has the token for it."
- The edit token is now **permanent** (see `migration_2026-08-22_my_listings.sql`) instead of being deleted after first use — it has to survive so the same browser can open more edit sessions, or delete the listing, at any time later.
- `get_listing_for_owner(p_listing_id, p_edit_token)` is a `security definer` RPC that fetches a listing for its verified owner even if the public RLS select policy would otherwise hide it (status `'reported'`, or past `expires_at`) — it's the only way My Listings can show what actually happened to a listing instead of it just silently vanishing.
- Editing reuses the existing Post page/form/review-veil wholesale — `handleEditClick()` opens a fresh 10-minute lease via `begin_public_listing_edit()`, pre-fills every field, and the same "Confirm" button calls `update_public_listing()` instead of `create_public_listing()`.
- Deleting calls `delete_public_listing(p_listing_id, p_edit_token)` behind a confirm step; no edit lease is required for a delete.

Reporting a listing
- `report_listing(p_listing_id, p_reason?)` is a `security definer` RPC — anon has no direct write access to `listing_reports` or to `listings.report_count`, this function is the only path.
- Each call inserts one audit row into `listing_reports` and increments `listings.report_count`. At 3 reports the listing's `status` flips to `'reported'`, which the existing RLS select policy already excludes from public reads — no separate moderation UI needed for the common case.
- The threshold is deliberately low: a false positive just means a legitimate poster republishes, while slow takedown of an abusive listing is the costlier failure mode on a no-login board.
- Client-side, `app.js` remembers reported listing IDs in `localStorage` so the same browser can't spam the button — this stops accidental double-taps, not a determined abuser. A real rate limit would need either accounts or a server-side signal (IP, device fingerprint via an edge function) that this stack doesn't currently have.

Location pin
- Posting a listing now supports an optional device-location pin (`lat`/`lng` columns on `listings`). It is **not** address verification — there's no accessible dataset of real Kuwait block boundaries, so `app.js` only checks the pin against a rough, hand-picked neighbourhood-centre coordinate (`AREA_CENTROIDS`) and shows a soft warning past ~8km. It never blocks publishing.
- On listing cards, a pin is shown as a 📍 icon that opens `https://www.google.com/maps?q=lat,lng` in a new tab.

