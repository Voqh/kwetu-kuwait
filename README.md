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
License

TBD.
