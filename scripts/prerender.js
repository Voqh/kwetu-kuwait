#!/usr/bin/env node
/**
 * Pre-render Script for Kwetu Kuwait
 * Fetches live listings from Supabase and bakes them into index.html
 * Runs on a schedule (every 5 minutes) via GitHub Actions
 */

const fs = require('fs');
const path = require('path');

// Supabase client
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL or SUPABASE_ANON_KEY not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Main pre-render function
 */
async function prerender() {
  console.log('🔄 Starting pre-render...');

  try {
    // 1. Fetch active listings
    console.log('📋 Fetching active listings...');
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('id, area, block, type, rent_kwd, description')
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .limit(500);

    if (listingsError) throw listingsError;
    console.log(`✅ Found ${listings?.length || 0} active listings`);

    // 2. Compute area statistics from listings
    console.log('📊 Computing area statistics...');
    const areaStats = {};
    (listings || []).forEach(listing => {
      areaStats[listing.area] = (areaStats[listing.area] || 0) + 1;
    });
    const areaCounts = Object.entries(areaStats).map(([area, count]) => ({
      area,
      count
    }));
    console.log(`✅ Found ${Object.keys(areaStats).length} areas`);

    // 3. Read current HTML
    console.log('📄 Reading current HTML...');
    const indexPath = path.join(__dirname, '../index.html');
    let html = fs.readFileSync(indexPath, 'utf-8');

    // 4. Insert listings and area stats as JSON in a script tag
    console.log('🔨 Injecting data into HTML...');

    // Create data injection script
    const dataScript = `
<script type="application/json" id="prerender-data">
{
  "listings": ${JSON.stringify(listings)},
  "areaStats": ${JSON.stringify(areaStats)},
  "renderedAt": "${new Date().toISOString()}"
}
</script>`;

    // Inject before closing body tag (remove old one first if it exists)
    html = html.replace(
      /<script type="application\/json" id="prerender-data">[\s\S]*?<\/script>/,
      dataScript
    );

    // If it didn't exist, add it before closing body
    if (!html.includes('id="prerender-data"')) {
      html = html.replace('</body>', dataScript + '\n</body>');
    }

    // 5. Inject initial area board rows
    const boardRows = Object.entries(areaStats)
      .map(([areaName, count]) => {
        let status = 'FULL';
        if (count > 3) status = 'OPEN';
        else if (count > 0) status = 'FEW LEFT';

        return `<div class="board-row" data-area="${areaName}">
          <span>${areaName}</span>
          <span class="board-open">${count}</span>
          <span class="board-status board-status--${status.toLowerCase().replace(' ', '-')}">${status}</span>
        </div>`;
      })
      .join('\n');

    // Replace board rows - use a more specific pattern to avoid matching inner divs
    // Look for the exact pattern: <div id="boardRows"> ... </div> followed by <div class="board-foot">
    html = html.replace(
      /<div id="boardRows">[\s\S]*?<\/div>(?=\s*<div class="board-foot">)/,
      `<div id="boardRows">\n${boardRows}\n</div>`
    );

    // 6. Inject area grid chips
    const areaChips = Object.entries(areaStats)
      .map(([areaName, count]) => {
        let statusBadge = 'full';
        if (count > 3) statusBadge = 'open';
        else if (count > 0) statusBadge = 'few-left';

        return `<button class="area-chip area-chip--${statusBadge}" data-area="${areaName}">
          <span class="area-name">${areaName}</span>
          <span class="area-status">${count} open</span>
          <span class="area-badge">${statusBadge === 'open' ? 'open' : statusBadge === 'few-left' ? 'few left' : 'full'}</span>
        </button>`;
      })
      .join('\n');

    // Replace area grid - use a more specific pattern to avoid matching inner divs
    // Look for the exact pattern: <div class="area-grid" id="areaGrid"> ... </div> with end marker
    html = html.replace(
      /<div class="area-grid" id="areaGrid">[\s\S]*?<\/div>(?=\s*<\/div>\s*<\/section>)/,
      `<div class="area-grid" id="areaGrid">\n${areaChips}\n</div>`
    );

    // 7. Add SEO meta tags with structured data
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'ApartmentComplex',
      'name': 'Kwetu Kuwait',
      'description': 'Find your room in Kuwait — no login, no fees, just neighbours helping neighbours',
      'url': 'https://kwetukuwait.com',
      'address': {
        '@type': 'PostalAddress',
        'addressCountry': 'KW',
        'addressLocality': 'Kuwait'
      },
      'numberOfRooms': listings?.length || 0,
      'offers': listings?.slice(0, 20).map(l => ({
        '@type': 'Offer',
        'category': l.type,
        'areaServed': l.area,
        'price': l.rent_kwd || 'Contact for price',
        'priceCurrency': 'KWD',
        'description': (l.description || '').substring(0, 100)
      })) || []
    };

    const structuredDataTag = `
<script type="application/ld+json">
${JSON.stringify(structuredData, null, 2)}
</script>`;

    // Replace existing structured data if present
    if (html.includes('type="application/ld+json"')) {
      html = html.replace(
        /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
        structuredDataTag
      );
    } else {
      html = html.replace('</head>', structuredDataTag + '\n</head>');
    }

    // 8. Write pre-rendered HTML
    console.log('💾 Writing pre-rendered HTML...');
    fs.writeFileSync(indexPath, html);

    console.log('✅ Pre-render complete!');
    console.log(`📊 Listings: ${listings?.length || 0}`);
    console.log(`🗺️  Areas: ${Object.keys(areaStats).length || 0}`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

  } catch (error) {
    console.error('❌ Pre-render failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  prerender();
}

module.exports = { prerender };
