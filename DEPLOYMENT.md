# Deployment Guide - Kwetu Kuwait (Current)

**Last Updated**: 2026-09-09  
**Current Architecture**: GitHub Pages (Frontend) + Supabase (Backend) + GitHub Actions (Automation)

---

## Overview

Kwetu Kuwait is currently deployed across three services:

| Service | Purpose | Status |
|---------|---------|--------|
| **GitHub Pages** | Static frontend (HTML/CSS/JS) | ✅ LIVE at kwetukuwait.com |
| **Supabase** | PostgreSQL database + RLS + Edge Functions | ✅ LIVE |
| **GitHub Actions** | Automated daily purge scheduling | ✅ ACTIVE |

---

## Frontend: GitHub Pages

### Current Configuration

**Repository**: https://github.com/Voqh/kwetu-kuwait  
**Branch**: main  
**Domain**: kwetukuwait.com  
**Status**: LIVE (DNS fully propagated)

### DNS Records (GoDaddy)

```
Type    | Name | Value                    | TTL
--------|------|--------------------------|-------
A       | @    | 185.199.108.153         | 600s
A       | @    | 185.199.109.153         | 600s
A       | @    | 185.199.110.153         | 600s
A       | @    | 185.199.111.153         | 600s
CNAME   | www  | Voqh.github.io          | 1h
```

### How Deployments Work

1. Push code to `main` branch
2. GitHub automatically deploys to GitHub Pages
3. Site goes live at `kwetukuwait.com` within ~2 minutes

### Files Served

- `index.html` (main app)
- `privacy.html`, `terms.html` (legal pages)
- `css/style.css` (styling)
- `js/app.js` (frontend logic)
- `js/supabase-client.js` (database client)
- `CNAME` (custom domain configuration)
- `robots.txt`, `sitemap.xml` (SEO)

---

## Backend: Supabase

### Database

**Project**: Kwetu Kuwait  
**Project Ref**: `gdhxmwftdlkhlwmcafto`  
**API URL**: https://gdhxmwftdlkhlwmcafto.supabase.co  
**Region**: US (default)  
**Status**: ✅ Active

### Connection

Frontend connects via public anon key:
```javascript
const SUPABASE_ANON_KEY = "sb_publishable_bvgmerahX7Ubwic2yX81JA_lTJMdItZ";
```

**Note**: This key is intentionally public and safe. Database protection is enforced via Row Level Security (RLS) policies + SECURITY DEFINER functions on the backend.

### Schema & Migrations

Base schema: `schema.sql`  
Migrations: `migrations/` (applied sequentially via Supabase CLI or dashboard)

**Current migrations** (001-008):
- 001: Rate limit reports (1/day per listing)
- 002: Enforce edit lease (10-minute window)
- 003: Input validation & normalization
- 004: Scrub expired contact info
- 005: Harden function privileges
- 006: Add admin functions & views
- 007: Fix view security (admin schema)
- 008: Fix RLS policies

**To apply migrations**:
```bash
supabase migration up
# or manually paste each file into Supabase SQL Editor
```

### Edge Functions

**Deployed**: purge-listings, moderation, export-reports  
**Trigger**: HTTP + optional cron (purge-listings only)

#### purge-listings
```
URL: https://gdhxmwftdlkhlwmcafto.supabase.co/functions/v1/purge-listings
Method: POST
Trigger: Daily at 3:00 AM UTC via GitHub Actions
Response: { success: true, listings_purged: N, leases_purged: N }
```

#### moderation
```
URL: https://gdhxmwftdlkhlwmcafto.supabase.co/functions/v1/moderation
Method: POST
Auth: x-admin-secret header
Actions:
  ?action=queue → List reported listings
  ?action=reinstate&listing_id=ID → Set status='active'
  ?action=delete&listing_id=ID → Delete listing
```

#### export-reports
```
URL: https://gdhxmwftdlkhlwmcafto.supabase.co/functions/v1/export-reports
Method: POST
Auth: x-admin-secret header
Response: CSV file download
```

### Environment Variables (Supabase)

Set via: Project → Settings → Edge Functions → Secrets

```
ADMIN_SECRET=4505e487a8d15ec865d2a8dda379e21fed2136f4ec84a3643066d9d8d8abd0d5
```

**Note**: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-provided by Supabase and don't need to be manually set.

---

## Automation: GitHub Actions

### Daily Purge Workflow

**File**: `.github/workflows/daily-purge.yml`  
**Trigger**: 0 3 * * * (3 AM UTC daily, 6 AM Kuwait Time)  
**Action**: Calls purge-listings Supabase function

**Status**: ✅ Active (automatically runs every morning)

**To monitor**:
1. Go to: https://github.com/Voqh/kwetu-kuwait/actions
2. Select "Daily Purge Expired Listings"
3. View past/upcoming runs

**To test manually**:
1. Click "Run workflow" button
2. Select branch `main`
3. Click green "Run" button
4. Watch real-time execution

---

## Analytics: Google Analytics 4

**Measurement ID**: G-WWXVVE6DX3  
**Type**: Web property  
**Status**: ✅ Active (tracking all events)

### Integration

GA4 script included in all HTML files (index.html, privacy.html, terms.html):
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-WWXVVE6DX3"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-WWXVVE6DX3', { 'anonymize_ip': true });
</script>
```

### Events Tracked

- `page_view` - Page loads (home, listings, post, my listings, legal pages)
- `post_listing_complete` - New listing created
- `post_listing_error` - Listing creation failed
- `search_listings` - Search performed
- `report_listing` - Listing reported
- `report_listing_error` - Report failed
- `view_area_listings` - Area browsed
- `whatsapp_click` - WhatsApp contact link clicked
- `exception` - Client-side errors

View real-time activity: https://analytics.google.com → Select "Kwetu Kuwait"

---

## Admin Panel

**URL**: `/admin.html` (not linked from main nav for security)  
**Full URL**: https://kwetukuwait.com/admin.html

### Access

1. Open https://kwetukuwait.com/admin.html
2. Enter ADMIN_SECRET: `4505e487a8d15ec865d2a8dda379e21fed2136f4ec84a3643066d9d8d8abd0d5`
3. Click "Authenticate"
4. You can now:
   - View moderation queue
   - Reinstate reported listings
   - Delete listings
   - Export abuse reports as CSV

### Functions Used

Admin panel calls Supabase Edge Functions directly:
- `GET /functions/v1/moderation?action=queue` → List reported listings
- `POST /functions/v1/moderation?action=reinstate&listing_id=<id>` → Reinstate
- `POST /functions/v1/moderation?action=delete&listing_id=<id>` → Delete
- `GET /functions/v1/export-reports` → Download CSV

---

## Monitoring & Troubleshooting

### Check GitHub Pages Status
```
https://github.com/Voqh/kwetu-kuwait/deployments
```

### Check Supabase Database Status
```
https://app.supabase.com/project/gdhxmwftdlkhlwmcafto
→ Inspect → Database → Monitor
```

### Check Function Logs
```
https://app.supabase.com/project/gdhxmwftdlkhlwmcafto
→ Edge Functions → Click function name → Logs tab
```

### Check GitHub Actions Runs
```
https://github.com/Voqh/kwetu-kuwait/actions
```

### Check Analytics
```
https://analytics.google.com
→ Select "Kwetu Kuwait" property
→ Real-time tab for live events
```

---

## Making Changes

### Update Frontend

1. Edit `.html`, `.js`, or `.css` files
2. Commit & push to `main`:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```
3. GitHub Pages auto-deploys (live in ~2 min)

### Update Database

1. Create new migration file: `migrations/20260910_XXX_description.sql`
2. Apply via Supabase CLI:
   ```bash
   supabase migration up
   ```
   Or manually in Supabase SQL Editor:
   - Paste migration file content
   - Run

3. Update `schema.sql` to reflect final state (documentation)

### Update Environment Secrets

1. Supabase → Settings → Edge Functions → Secrets
2. Edit or add secrets
3. Changes take effect immediately on next function call

### Update GitHub Actions Workflow

1. Edit `.github/workflows/daily-purge.yml`
2. Commit & push to `main`
3. New schedule/logic takes effect on next run

---

## Disaster Recovery

### If GitHub Pages Goes Down

1. Check GitHub Status: https://www.githubstatus.com
2. Force re-deploy:
   ```bash
   git commit --allow-empty -m "Trigger redeploy"
   git push
   ```

### If Supabase Database Has Issues

1. Check Supabase Status: https://status.supabase.com
2. Access backup via Supabase dashboard → Backups tab
3. Restore if needed (paid tier feature)

### If Admin Secret Needs to Be Rotated

1. Generate new secret: `openssl rand -hex 32`
2. Update in Supabase → Settings → Edge Functions → Secrets
3. Share new secret securely with admins only
4. Update admin.html hardcoded reference if needed (not recommended - use env instead)

---

## Performance Metrics

**Expected Response Times**:
- Frontend load: <2 seconds (GitHub Pages CDN)
- Database query: <200ms (Supabase)
- Edge function call: <500ms (Supabase Singapore region)
- Admin login: <1 second (via edge function)

**Monitoring**:
- GitHub Pages Analytics: https://github.com/Voqh/kwetu-kuwait
- Supabase Metrics: Project → Inspect → Database → Monitor
- Google Analytics: https://analytics.google.com

---

## Cost

**Current Setup (Free Tier)**:
| Service | Cost | Limit |
|---------|------|-------|
| GitHub Pages | FREE | Unlimited bandwidth |
| Supabase | FREE | 500MB storage, 2M API calls/month |
| Google Analytics | FREE | Unlimited |
| GitHub Actions | FREE | 2000 min/month (well under limit) |

**When to upgrade**:
- GitHub Pages: Never (free tier is unlimited)
- Supabase: $25/month at 1GB+ storage or 5M+ API calls
- GA: $350/month only if using GA360 (not needed for this project)
- GitHub Actions: Upgrade to Pro if >2000 min/month (unlikely)

---

## Security Checklist

- ✅ ADMIN_SECRET stored in Supabase (encrypted at rest)
- ✅ Edit tokens stored only in browser localStorage
- ✅ RLS policies restrict database access properly
- ✅ CSP headers prevent XSS
- ✅ HTTPS enforced (GitHub Pages + Supabase auto-HTTPS)
- ✅ No API keys in frontend code (except public anon key)
- ✅ Edge functions use service role key (never exposed to client)

---

## Contact & Support

For issues with:
- **Frontend**: Check GitHub Pages status, inspect browser console
- **Database**: Check Supabase status, view function logs
- **Admin panel**: Verify ADMIN_SECRET, check edge function logs
- **Analytics**: Check GA4 property, verify gtag script in HTML

---

Generated: 2026-09-09  
Last Updated: 2026-09-09
