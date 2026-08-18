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



