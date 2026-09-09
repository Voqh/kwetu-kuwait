# Supabase Edge Functions for Kwetu Kuwait

This directory contains three Supabase Edge Functions that replace the previous Netlify serverless functions.

## Functions

### 1. purge-listings
- **Purpose**: Daily cleanup of expired listings
- **Trigger**: Scheduled (3 AM UTC daily via Supabase scheduler)
- **Permissions**: Service role key
- **Endpoint**: `https://<project-ref>.supabase.co/functions/v1/purge-listings`

### 2. moderation
- **Purpose**: Admin panel operations for moderators
- **Trigger**: HTTP POST with `x-admin-secret` header
- **Actions**: 
  - `?action=queue` - List reported listings
  - `?action=reinstate&listing_id=<id>` - Reinstate a listing
  - `?action=delete&listing_id=<id>` - Delete a listing
- **Endpoint**: `https://<project-ref>.supabase.co/functions/v1/moderation`

### 3. export-reports
- **Purpose**: Export abuse reports as CSV for analysis
- **Trigger**: HTTP POST with `x-admin-secret` header
- **Output**: CSV file download
- **Endpoint**: `https://<project-ref>.supabase.co/functions/v1/export-reports`

## Deployment

### Prerequisites
```bash
npm install -g supabase
# or
brew install supabase/tap/supabase
```

### Steps

1. **Authenticate with Supabase**
```bash
supabase login
```

2. **Link your project**
```bash
supabase link --project-ref <YOUR_PROJECT_REF>
```

3. **Set environment variables**
In your Supabase project dashboard → Project Settings → Edge Functions:
```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
ADMIN_SECRET=<generate-a-strong-random-secret>
```

4. **Deploy functions**
```bash
supabase functions deploy
```

5. **Set up purge-listings schedule** (via Supabase dashboard or CLI):
```bash
supabase functions deploy purge-listings --no-verify-jwt --update-schedule "0 3 * * *"
```

## Testing Locally

```bash
# Start local Supabase
supabase start

# Invoke function locally
supabase functions invoke purge-listings

# Or via HTTP
curl -X POST http://localhost:54321/functions/v1/purge-listings
```

## Admin Secret Setup

Generate a strong random secret:
```bash
openssl rand -hex 32
```

Then add to Supabase project settings under Edge Function Secrets.

All three functions require this secret in the `x-admin-secret` header (or use environment-based verification in Supabase dashboard).

## Migration Notes

These functions replace:
- `netlify/functions/purge-listings.js` → `supabase/functions/purge-listings/index.ts`
- `netlify/functions/moderation.js` → `supabase/functions/moderation/index.ts`
- `netlify/functions/export-reports.js` → `supabase/functions/export-reports/index.ts`

**Breaking changes**: None (same API contracts, just new endpoint URLs)
