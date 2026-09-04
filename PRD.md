# Kwetu Kuwait — Product Requirements Document

## Problem & Audience

**The Problem**: Finding a room in Kuwait (for the African diaspora and expat communities) is slow, fragmented, and requires navigating portals in Arabic or dealing with real-estate intermediaries who don't understand community needs. A traveler or recent migrant needs to search across competing sites, verify listings with phone calls, and has no guarantee of current availability.

**The Audience**: African expatriate workers and students in Kuwait seeking accommodation — typically age 20–45, comfortable with WhatsApp, accustomed to informal peer-to-peer housing networks, and looking for efficiency over luxury. Secondary audience: landlords/existing tenants renting spare beds or partitions who want direct access to this community.

**Why It Matters**: In Kuwait, housing is segregated by citizenship (Kuwaiti villas vs. investment-area apartments), and African expats cluster in specific neighborhoods. Kwetu Kuwait bridges that geography with area-first search, community trust, and WhatsApp-native contact.

---

## Core User Flows

### 1. Posting a Listing (Visitor → Listing)
1. Visitor lands on homepage, taps "Post a room"
2. Completes form: **area** (required), **block** (required), **type** (optional: Apartment/Room/Partition/Bedspace), **description** (required, up to 1000 chars), **rent in KWD** (optional, decimals allowed), **WhatsApp number** (required, E.164 format)
3. System generates a 64-character cryptographic edit token, stores it in browser localStorage
4. Listing is created in database; auto-expires in 30 days
5. Visitor is shown their listing ID and reminded to save the token (only proof of ownership)
6. **Outcome**: Listing appears on the board immediately, searchable by area

### 2. Editing a Listing (Owner → Updated Listing)
1. Owner opens "My Listings" page; if token exists in localStorage, system retrieves their listing
2. Owner taps "Edit"; system creates a 10-minute edit-lease window
3. Owner updates one or more fields (area, block, description, price, phone)
4. System validates all fields, normalizes whitespace in description
5. Owner taps "Save"; update succeeds only if lease is still active AND token matches
6. Lease closes (not deleted); token hash persists for future edits
7. **Outcome**: Listing is updated in real time; expiry date does NOT reset

### 3. Searching for a Room (Searcher)
1. Searcher sees homepage with 13 core areas (Salmiya, Hawally, Farwaniya, etc.)
2. Taps an area card or uses search input (text/type filters)
3. Results render newest-first, showing: area, block, listing type, description snippet, price, WhatsApp link
4. Searcher taps a WhatsApp link; app opens WhatsApp message to the poster
5. Searcher and poster negotiate offline (Kwetu is contact-only, not transactional)
6. **Outcome**: Direct p2p connection; no intermediary, no platform involvement in the deal

### 4. Reporting Abuse (Visitor)
1. Searcher finds a suspicious listing (spam, scam, offensive content)
2. Taps "Report" on the listing card
3. Optional reason field (max 300 chars)
4. Client-side: localStorage records the report to prevent accidental duplicates
5. Server-side: report_listing() RPC increments the listing's report_count
6. **Once 3 reports are reached**: listing is auto-hidden (status → 'reported'), no longer visible to public searches
7. Owner can re-publish the same content under a new listing ID (no appeal process; low threshold is intentional)
8. **Outcome**: Spam/scams are taken down in minutes, not days; false positives are low-cost (repost)

### 5. Data Lifecycle
- **Posted**: Listing is active, searchable, owner has edit token in localStorage
- **Day 30**: Listing still active, but WhatsApp number is automatically deleted (contact scrubbed)
- **Day 30+**: Posting is still visible to the owner (via their token) but no longer downloadable publicly
- **Day 37**: Listing row is hard-deleted from database; edit session cleaned up
- **Reported**: If report_count ≥ 3, listing becomes invisible in public searches immediately; owner can retrieve it via token and see report count

---

## What's Out of Scope (Deliberately)

- **User accounts**: No sign-up, login, passwords, or email verification. Kwetu is stateless.
- **Payments**: No rent collection, deposit management, or transaction processing. All money flows p2p off-platform.
- **Phone verification**: SMS OTP would require infrastructure Kwetu doesn't have and adds friction. WhatsApp number is the contact layer.
- **Messaging**: No built-in DM system. Kwetu links directly to WhatsApp; the poster owns the conversation.
- **Reputation/reviews**: No star ratings or public feedback. High false-positive risk on a no-login board.
- **Price negotiation**: Prices are post-only, not marketplace offers. Negotiation happens in WhatsApp.
- **Compliance verification**: No landlord ID, lease templates, or legal checks. This is a bulletin board, not a legal platform.

---

## Success Criteria

A working Kwetu Kuwait is defined by:

1. **Speed**: Visitor can post a listing in <2 minutes (form + token generation + publish)
2. **Discovery**: Searcher finds listings by area within seconds (no login required)
3. **Contact**: One tap opens WhatsApp to poster; no forwarding, no notification system
4. **Trust**: Abuse is handled within hours via low-friction reporting; false positives are acceptable
5. **Retention**: Listings auto-expire so the board doesn't fill with stale inventory; editing doesn't reset expiry
6. **Data minimalism**: Only WhatsApp number, area, and basic description are stored; no tracking, no analytics IDs
7. **Availability**: Runs on Supabase free tier + Netlify free tier; stays live during low usage (solves auto-pause with uptime pings)

---

## Open Product Questions

1. **Per-field consent for phone display**: Should visitor be asked "show my number to searchers?" or is it implicitly public? Currently implicit. Risk: scammers copy contact-heavy listings.
   
2. **Data retention after expiry**: Should we retain the full listing (anonymized) for moderation history, or delete it entirely? Currently retained for 7 days post-expiry (metadata audit trail), then hard-deleted. This decision depends on liability posture.

3. **Block-level specificity**: "Block 5" is useful to expats, but shouldn't we group blocks by zone or show a map? Deferred — area alone works, blocks are refinement.

4. **Reporting reason UX**: Should reasons be free-text (current) or a dropdown (spam/scam/offensive)? Current is more flexible but less data-rich for moderation.

5. **Repeat posting**: If a listing is reported and hidden, can the same person post again? Currently yes (new token, new UUID). Is this a feature (low friction) or a bug (gaming)? Depends on abuse patterns.

6. **Area expansion**: Should we add neighborhoods beyond Kuwait's 50 registered administrative areas (e.g., informal zones)? Currently: 13 core expat areas + 27 secondary areas + "Other". Likely enough.

---

## Version History

- **v0** (2025-08-29): Soft launch. Listings, posting, searching, reporting enabled. Zero payment, zero accounts.
