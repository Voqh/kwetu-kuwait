# Google Analytics 4 Setup Guide — Kwetu Kuwait

This document guides you through setting up Google Analytics 4 (GA4) to track user behavior and errors on Kwetu Kuwait.

---

## Step 1: Create a Google Analytics 4 Property

1. Go to [Google Analytics](https://analytics.google.com/)
2. Sign in with your Google account (create one if needed)
3. Click **+ Create** → **Account**
   - Account name: "Kwetu Kuwait"
   - Accept the default data sharing settings
4. Click **Next** → **Property**
   - Property name: "Kwetu Kuwait Web"
   - Reporting timezone: "Asia/Kuwait"
   - Currency: "KWD"
5. Click **Next** → **Business objectives** (optional, can skip)
6. Click **Create**

---

## Step 2: Get Your Measurement ID

1. In Google Analytics, go to **Admin** (bottom left) → **Property Settings**
2. Copy your **Measurement ID** (format: `G-XXXXXXXXXX`)
3. Keep this handy for the next step

---

## Step 3: Add Your Measurement ID to the Website

1. In your code editor, open these files:
   - `/index.html`
   - `/privacy.html`
   - `/terms.html`

2. Find the Google Analytics script tag (look for `GA_MEASUREMENT_ID` placeholder)

3. Replace `GA_MEASUREMENT_ID` with your actual ID in all places:
   ```html
   <!-- Example: if your ID is G-ABC123XYZ -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC123XYZ"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());
     gtag('config', 'G-ABC123XYZ', { 'anonymize_ip': true });
   </script>
   ```

4. Deploy your website (push changes to production)

---

## Step 4: Verify Data is Flowing

1. Go back to Google Analytics → **Real-time** (left sidebar)
2. Visit your website in a new tab
3. Within seconds, you should see traffic in the Real-time view
4. If you don't see data after 2-3 minutes:
   - Check that you replaced the correct ID
   - Clear browser cache and reload
   - Check browser console (F12) for any errors

---

## Events Being Tracked

Google Analytics automatically captures:

### Page Views
- Home page (`view_page_home`)
- Listings browsing (`view_listings_page`)
- Post a room flow (`post_listing_start`)
- My Listings (`view_page_my_listings`)
- Privacy & Terms pages

### User Actions
- **Posting**: `post_listing_complete` (includes area + listing type)
- **Editing**: `edit_listing_complete` (includes listing ID)
- **Searching**: `search_listings` (includes search term + results count)
- **Browsing**: `browse_area` (includes area name + listing count)
- **Reporting**: `report_listing` (includes listing ID + reason)
- **WhatsApp Contact**: `whatsapp_click` (includes area)

### Errors (Automatically Tracked)
- `post_listing_error` — Failed to create/publish listing
- `edit_listing_error` — Failed to edit listing
- `report_listing_error` — Failed to report listing
- `rpc_*` — Failed RPC calls (includes RPC name + error message)

---

## Viewing Your Data

### Dashboard
1. Go to **Reports** (left sidebar)
2. **Real-time** — See live traffic (updated every few seconds)
3. **Reports** → **User engagement** → See page views, events, bounce rate

### Custom Reports
1. Go to **Explore** (left sidebar)
2. Create custom reports to analyze:
   - How many listings are being posted
   - Which areas are most browsed
   - Search trends
   - Error rates

---

## Privacy & Compliance

✅ **Anonymization Enabled**: All IP addresses are anonymized by default
- Config: `'anonymize_ip': true`
- Users cannot be personally identified

✅ **No Personal Data**: 
- We don't collect email, WhatsApp numbers, or names
- Only anonymous behavior (area, search terms, actions)

✅ **User Privacy Respected**:
- Compliant with GDPR, CCPA, and Kuwait privacy laws
- Users can opt out via GA privacy settings

⚠️ **Privacy Policy Update**:
- Add line to privacy.html: "This site uses Google Analytics to track anonymous usage patterns."

---

## Example Custom Events to Track

You can extend tracking by adding more events. Examples:

```javascript
// Track successful WhatsApp contact attempt
analyticsEvents.clickWhatsappLink('Salmiya');

// Track viewing individual listing
analyticsEvents.viewListingDetail('Hawally', 'Room');

// Track when a user deletes their listing
analyticsEvents.deleteListingComplete('listing-uuid-123');
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No data in Real-time | Check Measurement ID is correct and deployed |
| Events not showing | Ensure browser isn't blocking Google Analytics (check console) |
| Wrong area name | Verify area name capitalization matches AREAS config |
| Error not tracked | Check browser console for JS errors preventing tracking |

---

## Next Steps

1. ✅ Add Measurement ID to all HTML files
2. ✅ Deploy website
3. ✅ Verify data in Real-time view
4. Set up **Alerts** for high error rates:
   - Admin → Events → Filter for errors → Alert
5. Create **Custom Dashboards** for monitoring:
   - Listings posted per day
   - Search volume trends
   - Error frequency
6. Review data weekly to identify patterns and issues

---

## Support

- **GA4 Documentation**: https://support.google.com/analytics/topic/9756801
- **Event tracking**: https://developers.google.com/analytics/devguides/collection/ga4/events
- **Troubleshoot**: https://support.google.com/analytics/answer/12508693
