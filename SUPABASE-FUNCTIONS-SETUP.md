# Manual Schedule Setup for purge-listings

Since Supabase Edge Functions scheduling requires specific dashboard configuration, here's how to set it up manually:

## Steps to Enable Cron Schedule

1. **Go to Supabase Dashboard:**
   - Visit: https://app.supabase.com/dashboard/project/gdhxmwftdlkhlwmcafto/functions

2. **Navigate to purge-listings function:**
   - In the left sidebar, click **Functions** under MANAGE
   - Click on **purge-listings** from the list

3. **Look for Scheduled Function Option:**
   - In the function details page, look at the **top toolbar**
   - You should see options like: Overview, Invocations, Logs, Code, Settings
   - Some Supabase projects show a **"Schedule"** button or option here
   - Alternatively, check if there's a **"More options"** menu (three dots) with scheduling

4. **If you find a Schedule/Cron section:**
   - Click to enable scheduling
   - Enter cron expression: `0 3 * * *`
   - This means: Every day at 3:00 AM UTC
   - Click Save

5. **If no Schedule UI appears:**
   - This function will still work when invoked manually or via HTTP
   - You can trigger it manually by visiting the function URL:
     ```
     https://gdhxmwftdlkhlwmcafto.supabase.co/functions/v1/purge-listings
     ```
   - Or set up a GitHub Actions workflow to call it daily

## Alternative: Set Up Automated Trigger via GitHub Actions

If Supabase doesn't show schedule UI, create `.github/workflows/daily-purge.yml`:

```yaml
name: Daily Purge Listings

on:
  schedule:
    - cron: '0 3 * * *'  # 3 AM UTC daily

jobs:
  purge:
    runs-on: ubuntu-latest
    steps:
      - name: Call purge-listings function
        run: |
          curl -X POST \
            'https://gdhxmwftdlkhlwmcafto.supabase.co/functions/v1/purge-listings' \
            -H 'Content-Type: application/json'
```

Then commit this to your repo and GitHub will automatically run it daily.

## Current Status

✅ **Functions deployed to Supabase**
- purge-listings: https://gdhxmwftdlkhlwmcafto.supabase.co/functions/v1/purge-listings
- moderation: https://gdhxmwftdlkhlwmcafto.supabase.co/functions/v1/moderation
- export-reports: https://gdhxmwftdlkhlwmcafto.supabase.co/functions/v1/export-reports

✅ **ADMIN_SECRET** set in Supabase Edge Function Secrets

⏳ **Schedule:** Needs to be configured (either via UI or GitHub Actions)

## Testing

To test purge-listings manually:
```bash
curl -X POST https://gdhxmwftdlkhlwmcafto.supabase.co/functions/v1/purge-listings
```

You should see a JSON response with `success: true` and listing counts purged.
