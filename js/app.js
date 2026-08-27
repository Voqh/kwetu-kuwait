// ---- Kuwait areas ----
// Area names are static frontend config (not stored in the DB). Open
// counts start at 0 and are filled in live from Supabase — see the call
// to fetchAreaCounts() further down.
//
// `tier: "expat"` = dense apartment/"investment" neighbourhoods where the
// African diaspora and expats in general actually rent — this is the same
// 13 areas the board always had, and they stay pinned first in every list
// and dropdown. `tier: "other"` = the rest of Kuwait's residential areas,
// appended after, so someone posting outside the usual neighbourhoods still
// has a real option instead of being funnelled into "Other".
//
// A note on this list, honestly stated: Kuwait doesn't publish a single
// legal "expats may live here" register — renting itself isn't restricted
// by law. What IS real is a de-facto split between "private housing" (villa
// areas zoned for Kuwaiti citizens, where non-citizens generally can't rent
// an apartment because none exist to rent) and "investment areas" (the
// multi-tenant apartment buildings expats actually occupy). The `expat`
// tier below reflects that investment-area pattern, cross-checked against
// where Kuwait's rental portals (Boshamlan, Bayut, Dare, Hilite) actually
// list apartment inventory — not an official source. Treat it as a strong
// default ordering, not a compliance ruling.
const AREAS = [
  // --- established expat/investment areas (unchanged, still first) ---
  { name: "Salmiya",    open: 0, status: "full", tier: "expat" },
  { name: "Hawally",    open: 0, status: "full", tier: "expat" },
  { name: "Farwaniya",  open: 0, status: "full", tier: "expat" },
  { name: "Mahboula",    open: 0, status: "full", tier: "expat" },
  { name: "Fahaheel",   open: 0, status: "full", tier: "expat" },
  { name: "Mangaf",     open: 0, status: "full", tier: "expat" },
  { name: "Khaitan",    open: 0, status: "full", tier: "expat" },
  { name: "Abbasiya",   open: 0, status: "full", tier: "expat" },
  { name: "Jleeb Al-Shuyoukh", open: 0, status: "full", tier: "expat" },
  { name: "Jabriya",   open: 0, status: "full", tier: "expat" },
  { name: "Fintas",     open: 0, status: "full", tier: "expat" },
  { name: "Abu Halifa", open: 0, status: "full", tier: "expat" },
  { name: "Riggae",     open: 0, status: "full", tier: "expat" },
  // --- additional apartment-heavy areas confirmed active on rental portals ---
  { name: "Egaila",             open: 0, status: "full", tier: "expat" },
  { name: "Sabahiya",           open: 0, status: "full", tier: "expat" },
  { name: "Riqqa",              open: 0, status: "full", tier: "expat" },
  { name: "Funaitees",          open: 0, status: "full", tier: "expat" },
  { name: "Ardiya",             open: 0, status: "full", tier: "expat" },
  { name: "Andalous",           open: 0, status: "full", tier: "expat" },
  { name: "Ferdous",            open: 0, status: "full", tier: "expat" },
  { name: "Kuwait City",        open: 0, status: "full", tier: "expat" },
  { name: "Maidan Hawally",     open: 0, status: "full", tier: "expat" },
  { name: "Jaber Al-Ali",       open: 0, status: "full", tier: "expat" },
  { name: "Sabah Al-Ahmad",     open: 0, status: "full", tier: "expat" },
  { name: "Ahmadi",             open: 0, status: "full", tier: "expat" },
  { name: "Adan",                open: 0, status: "full", tier: "expat" },
  { name: "Abraq Khaitan",      open: 0, status: "full", tier: "expat" },
  { name: "Hadiya",             open: 0, status: "full", tier: "expat" },
  { name: "Bneid Al-Gar",       open: 0, status: "full", tier: "expat" },
  // --- broader Kuwait areas (mostly private/villa zoning; some mixed) ---
  { name: "Shuwaikh",       open: 0, status: "full", tier: "other" },
  { name: "Sulaibikhat",    open: 0, status: "full", tier: "other" },
  { name: "Sulaibiya",      open: 0, status: "full", tier: "other" },
  { name: "Sabah Al-Nasser",open: 0, status: "full", tier: "other" },
  { name: "Al-Rai",         open: 0, status: "full", tier: "other" },
  { name: "Jahra",          open: 0, status: "full", tier: "other" },
  { name: "Surra",          open: 0, status: "full", tier: "other" },
  { name: "Qortuba",        open: 0, status: "full", tier: "other" },
  { name: "Bayan",          open: 0, status: "full", tier: "other" },
  { name: "Salwa",          open: 0, status: "full", tier: "other" },
  { name: "Rumaithiya",     open: 0, status: "full", tier: "other" },
  { name: "Shaab",          open: 0, status: "full", tier: "other" },
  { name: "Faiha",          open: 0, status: "full", tier: "other" },
  { name: "Daiya",          open: 0, status: "full", tier: "other" },
  { name: "Adailiya",       open: 0, status: "full", tier: "other" },
  { name: "Khaldiya",       open: 0, status: "full", tier: "other" },
  { name: "Kaifan",         open: 0, status: "full", tier: "other" },
  { name: "Shamiya",        open: 0, status: "full", tier: "other" },
  { name: "Nuzha",          open: 0, status: "full", tier: "other" },
  { name: "Yarmouk",        open: 0, status: "full", tier: "other" },
  { name: "Qadsiya",        open: 0, status: "full", tier: "other" },
  { name: "Mansouriya",     open: 0, status: "full", tier: "other" },
  { name: "Rawda",          open: 0, status: "full", tier: "other" },
  { name: "Other",          open: 0, status: "full", tier: "other" },
];

// ---- Blocks per area ----
// Sourced from Kuwait's postal-code-by-block system (Ministry of
// Communications / moc.gov.kw — each residential block gets its own 5-digit
// code, so "how many blocks" is a real, publicly listed number, not a
// guess). Confirmed counts below; PACI's Kuwait Finder app is the
// authoritative source if any of these need correcting.
//   Salmiya 12 · Hawally 12 · Jabriya 12 · Farwaniya 15 · Fahaheel 12
// Areas not in this table don't have a confirmed count from that source, so
// rather than invent one, the block selector falls back to a generic 1–10
// range plus an "Other / not listed" option that reveals a free-text field
// — the same escape hatch every area gets, just the default vs. the
// exception.
const AREA_BLOCK_COUNTS = {
  "Salmiya": 12,
  "Hawally": 12,
  "Jabriya": 12,
  "Farwaniya": 15,
  "Fahaheel": 12,
};
const DEFAULT_BLOCK_COUNT = 10;
const OTHER_BLOCK_VALUE = "__other__";

function blockCountFor(areaName) {
  return AREA_BLOCK_COUNTS[areaName] || DEFAULT_BLOCK_COUNT;
}

function formatListingDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch (e) {
    return "";
  }
}

function flickerify(text) {
  return text
    .split("")
    .map((ch, i) => `<span style="--d:${i}">${ch}</span>`)
    .join("");
}

function statusLabel(status) {
  if (status === "open") return "OPEN";
  if (status === "few") return "FEW LEFT";
  return "FULL";
}

function deriveStatus(open) {
  if (open === 0) return "full";
  if (open <= 3) return "few";
  return "open";
}

// Merge live counts (from Supabase) into the known area list. Any area with
// no live listings yet still shows up, just with 0 open — this keeps the
// board's area list stable even before the backend has real data in it.
function buildAreasData(counts) {
  return AREAS.map((a) => {
    const open = counts && counts[a.name] != null ? counts[a.name] : a.open;
    return { name: a.name, open, status: deriveStatus(open) };
  });
}

// ---- Build departure board ----
const boardRows = document.getElementById("boardRows");
const areaGrid = document.getElementById("areaGrid");

function renderAreas(data) {
  boardRows.innerHTML = "";
  areaGrid.innerHTML = "";

  data.forEach((a, idx) => {
    const row = document.createElement("div");
    row.className = "board-row";
    row.style.setProperty("--d", idx);
    row.innerHTML = `
      <span class="flicker">${flickerify(a.name)}</span>
      <span>${String(a.open).padStart(2, "0")}</span>
      <span class="status-${a.status}">${statusLabel(a.status)}</span>
    `;
    boardRows.appendChild(row);

    const card = document.createElement("button");
    card.className = "area-card";
    card.type = "button";
    card.innerHTML = `
      <span class="area-card-name">${a.name}</span>
      <span class="area-card-count">${a.open} open &middot; ${statusLabel(a.status).toLowerCase()}</span>
    `;
    card.addEventListener("click", () => openAreaListings(a.name));
    areaGrid.appendChild(card);
  });
}

// Render areas into the dedicated search page list — a single flowing
// column of thin rows (not the home page's card grid; that 10-visible/
// scroll behavior stays exclusive to the home page).
const searchAreaGrid = document.getElementById('searchAreaGrid');
function renderSearchAreas(data) {
  if (!searchAreaGrid) return;
  searchAreaGrid.innerHTML = '';
  data.forEach((a) => {
    const btn = document.createElement('button');
    btn.className = 'search-area-row';
    btn.type = 'button';
    btn.innerHTML = `<span class="area-card-name">${a.name}</span><span class="area-card-count">${a.open} open · ${statusLabel(a.status).toLowerCase()}</span>`;
    btn.addEventListener('click', () => openAreaListings(a.name));
    searchAreaGrid.appendChild(btn);
  });
}

// Page-search: input, type filters, results, and suggestion handling
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const searchSuggestion = document.getElementById('searchSuggestion');
let _searchTypeFilter = 'All';
let currentSearchHighlightQuery = '';

// debounce helper
function debounce(fn, wait) {
  let t = null;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

// determine fuzzy threshold based on token length (stricter for short tokens)
function fuzzyThresholdFor(token) {
  if (!token) return 0;
  if (token.length <= 3) return 1;
  if (token.length <= 6) return 2;
  return 3;
}

// highlight helper: wraps matched tokens in <mark>
function escapeRegex(s){ return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
function highlightText(text, query) {
  if (!query || !text) return text;
  const tokens = query.toString().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return text;
  let out = text;
  tokens.forEach(t => {
    if (!t) return;
    try {
      const re = new RegExp('(' + escapeRegex(t) + ')', 'ig');
      out = out.replace(re, '<mark>$1</mark>');
    } catch (e) {}
  });
  return out;
}

function clearSearchUI() {
  if (searchResults) { searchResults.innerHTML = ''; searchResults.hidden = true; }
  if (searchSuggestion) { searchSuggestion.innerHTML = ''; searchSuggestion.hidden = true; }
  if (searchAreaGrid) searchAreaGrid.hidden = false;
}

async function performPageSearch(q) {
  if (!q || q.trim().length === 0) { clearSearchUI(); return; }
  q = q.trim();
  currentSearchHighlightQuery = q;
  if (searchAreaGrid) searchAreaGrid.hidden = true;
  if (searchResults) searchResults.hidden = false;

  const all = await gatherAllListings();
  const typeFilter = _searchTypeFilter && _searchTypeFilter !== 'All' ? _searchTypeFilter.toLowerCase() : null;
  const results = all.filter(item => {
    if (typeFilter && ((item.type||'').toLowerCase() !== typeFilter)) return false;
    const hay = `${item.area||''} ${item.type||''} ${item.description||''}`.toLowerCase();
    if (hay.includes(q.toLowerCase())) return true;
    const tokens = q.toLowerCase().split(/\s+/);
    return tokens.some(t => {
      if (t.length < 3) return hay.includes(t);
      const thr = fuzzyThresholdFor(t);
      return hay.split(/\s+/).some(w => levenshtein(w, t) <= thr);
    });
  });

  renderListingsToContainer(results, searchResults);

  // show autocomplete suggestions inline
  showAutocompleteSuggestions(q);

  // Suggest closest area name if user likely misspelled an area
  const areaNames = AREAS.map(a => a.name);
  let best = { name: null, dist: Infinity };
  areaNames.forEach(name => {
    const d = levenshtein(name.toLowerCase(), q.toLowerCase());
    if (d < best.dist) best = { name, dist: d };
  });
  const areaThr = fuzzyThresholdFor(q);
  if (best.dist <= Math.max(1, areaThr) && best.name) {
    if (searchSuggestion) {
      searchSuggestion.hidden = false;
      searchSuggestion.innerHTML = `Did you mean <button id="searchSuggestBtn">${best.name}</button>?`;
      const btn = document.getElementById('searchSuggestBtn');
      if (btn) btn.addEventListener('click', () => {
        // show listings for suggested area
        openAreaListings(best.name);
      });
    }
  } else {
    // No close single-area match — if there are no results, offer a small
    // 'No results — try these' suggestion list based on nearest areas and types.
    if (results.length === 0 && searchSuggestion) {
      const areaSug = getAreaSuggestions(q, 4);
      const types = ['Apartment', 'Room', 'Partition', 'Bedspace'];
      const typeSug = types.filter(t => {
        const l = t.toLowerCase();
        const ql = q.toLowerCase();
        return l.includes(ql) || levenshtein(l, ql) <= fuzzyThresholdFor(ql);
      });
      let html = '<div class="no-results-suggest">No listings found. Try these:</div><div class="suggest-list">';
      areaSug.forEach(a => { html += `<button class="suggest-btn" data-suggest="area:${a}">${a}</button>`; });
      typeSug.forEach(t => { html += `<button class="suggest-btn" data-suggest="type:${t}">${t}</button>`; });
      html += '</div>';
      searchSuggestion.hidden = false;
      searchSuggestion.innerHTML = html;
      // wire buttons
      Array.from(searchSuggestion.querySelectorAll('.suggest-btn')).forEach(b => b.addEventListener('click', (e) => {
        const v = b.getAttribute('data-suggest');
        if (!v) return;
        if (v.startsWith('area:')) openAreaListings(v.replace('area:',''));
        else if (v.startsWith('type:')) handleSearchSubmit(v.replace('type:',''));
      }));
    } else if (searchSuggestion) {
      searchSuggestion.hidden = true;
      searchSuggestion.innerHTML = '';
    }
  }
}

// wire up search input and type filters on the page
if (searchInput) {
  const debounced = debounce((val) => performPageSearch(val), 180);
  searchInput.addEventListener('input', (e) => debounced(e.target.value));
  searchInput.addEventListener('blur', () => setTimeout(() => hideAutocomplete(), 150));
}
document.querySelectorAll('.search-type-filters .type-filter').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.search-type-filters .type-filter').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    const t = b.getAttribute('data-type');
    _searchTypeFilter = t;
    if (!t || t === 'All') {
      // reset to initial search page state
      if (searchInput) { searchInput.value = ''; }
      currentSearchHighlightQuery = '';
      clearSearchUI();
      if (searchAreaGrid) searchAreaGrid.hidden = false;
      return;
    }
    // For specific types, open the listings page showing only that type
    (async () => {
      const all = await gatherAllListings();
      const filtered = all.filter(item => (item.type||'').toLowerCase() === t.toLowerCase());
      listingsAreaTitle.textContent = `${t} listings`;
      currentSearchHighlightQuery = t;
      renderListingCards(filtered);
      showListingsPage();
      safePushState({ page: 'listings', area: `type:${t}` }, `#type-${t.toLowerCase()}`);
    })();
  });
});

// Handle Enter key on search input to open full listings when the query
// clearly indicates a type or an area name.
if (searchInput) {
  searchInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await handleSearchSubmit(searchInput.value.trim());
    }
  });
}

// Autocomplete dropdown for area names (simple, keyboard-light)
let _autocompleteEl = null;
function ensureAutocompleteEl() {
  if (_autocompleteEl) return _autocompleteEl;
  const parent = pageSearch || document.body;
  const el = document.createElement('div');
  el.id = 'searchAutocomplete';
  el.className = 'search-autocomplete';
  el.hidden = true;
  parent.appendChild(el);
  _autocompleteEl = el;
  el.addEventListener('click', (e) => {
    const it = e.target.closest('.autocomplete-item');
    if (!it) return;
    const val = it.getAttribute('data-value');
    if (!val) return;
    // If it's an exact area name, open area listings
    const matched = AREAS.find(a => a.name.toLowerCase() === val.toLowerCase());
    if (matched) {
      openAreaListings(matched.name);
    } else {
      handleSearchSubmit(val);
    }
    hideAutocomplete();
  });
  return _autocompleteEl;
}

function hideAutocomplete(){ if (_autocompleteEl) { _autocompleteEl.innerHTML=''; _autocompleteEl.hidden=true; } }

function getAreaSuggestions(q, limit=6){
  if (!q || !q.trim()) return [];
  const ql = q.toLowerCase();
  const scores = AREAS.map(a=>{
    const name = a.name;
    const lower = name.toLowerCase();
    let score = 999;
    if (lower.startsWith(ql)) score = 0;
    else if (lower.includes(ql)) score = 1;
    else score = levenshtein(lower, ql);
    return { name, score };
  }).sort((a,b)=>a.score-b.score).slice(0,limit);
  return scores.map(s=>s.name);
}

function showAutocompleteSuggestions(q){
  const el = ensureAutocompleteEl();
  const suggestions = getAreaSuggestions(q, 6);
  if (!suggestions || suggestions.length === 0) { hideAutocomplete(); return; }
  el.innerHTML = suggestions.map(s=>`<div class="autocomplete-item" data-value="${s}">${s}</div>`).join('');
  el.hidden = false;
}

async function handleSearchSubmit(q) {
  if (!q) return;
  const ql = q.toLowerCase();

  // map common type keywords to canonical types
  const typeMap = {
    apartment: 'Apartment',
    apartments: 'Apartment',
    room: 'Room',
    rooms: 'Room',
    partition: 'Partition',
    partitions: 'Partition',
    bedspace: 'Bedspace',
    bedspaces: 'Bedspace',
    roommate: 'Bedspace'
  };

  // exact or fuzzy area match first
  let matchedArea = AREAS.find(a => a.name.toLowerCase() === ql) || AREAS.find(a => a.name.toLowerCase().includes(ql));
  if (!matchedArea) {
    // fuzzy check using levenshtein
    let best = { name: null, dist: Infinity };
    AREAS.forEach(a => {
      const d = levenshtein(a.name.toLowerCase(), ql);
      if (d < best.dist) best = { name: a.name, dist: d };
    });
    const thr = fuzzyThresholdFor(ql);
    if (best.dist <= Math.max(1, thr)) matchedArea = { name: best.name };
  }

  if (matchedArea) {
    openAreaListings(matchedArea.name);
    return;
  }

  // type match
  const mapped = typeMap[ql];
  if (mapped) {
    // gather listings and filter by type
    const all = await gatherAllListings();
    const filtered = all.filter(item => (item.type||'').toLowerCase() === mapped.toLowerCase());
    // show listings page and render
    listingsAreaTitle.textContent = `${mapped} listings`;
    currentSearchHighlightQuery = mapped;
    renderListingCards(filtered);
    showListingsPage();
    safePushState({ page: 'listings', area: `type:${mapped}` }, `#type-${mapped.toLowerCase()}`);
    return;
  }

  // fallback: run full search and if results found, open listings page with results
  const all = await gatherAllListings();
  const results = all.filter(item => {
    const hay = `${item.area||''} ${item.type||''} ${item.description||''}`.toLowerCase();
    if (hay.includes(ql)) return true;
    const tokens = ql.split(/\s+/);
    return tokens.some(t => (t.length<3) ? hay.includes(t) : hay.split(/\s+/).some(w=>levenshtein(w,t)<=2));
  });
  if (results && results.length > 0) {
    listingsAreaTitle.textContent = `Search results for "${q}"`;
    currentSearchHighlightQuery = q;
    renderListingCards(results);
    showListingsPage();
    safePushState({ page: 'listings', area: `search:${encodeURIComponent(q)}` }, `#search-${encodeURIComponent(q)}`);
    return;
  }

  // No results: show suggestion area (already handled by performPageSearch), so just run that
  performPageSearch(q);
}

// Render demo data immediately so the page never looks empty while the
// network request (if any) is in flight, then swap in live counts once
// Supabase responds — and silently keep the demo data if it's not configured
// or the request fails.
renderAreas(buildAreasData(null));
renderSearchAreas(buildAreasData(null));
if (typeof fetchAreaCounts === "function" && typeof isSupabaseConfigured === "function" && isSupabaseConfigured()) {
  fetchAreaCounts()
    .then(({ data, error }) => {
      if (!error && data) {
        renderAreas(buildAreasData(data));
        renderSearchAreas(buildAreasData(data));
      }
    })
    .catch(() => {
      /* stay on demo data */
    });
}

// ---- Live clock on the board ----
function updateClock() {
  const el = document.getElementById("boardClock");
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kuwait",
  });
}
updateClock();
setInterval(updateClock, 30000);

// ---- Post a room: real page, not an overlay, with working back navigation ----
// "Post a room" is now a full page (#page-post) rather than a centered modal.
// That's what fixes both complaints: (1) it's a normal document, so it
// scrolls top to bottom instead of being stuck centered on screen, and
// (2) we push a history entry when we open it, so the browser/device back
// gesture — and our own back arrow — return to the home page correctly.
//
// The History API (pushState/replaceState/back) is wrapped in try/catch
// everywhere below. Some sandboxed preview environments block it outright
// (throwing a SecurityError), and without the guard that crashes the whole
// script. On a real hosted domain these calls work normally; in a sandbox
// they just silently no-op and the page-swap logic still runs on its own.
let historyUsable = true;

function safePushState(state, url) {
  if (!historyUsable) return;
  try {
    history.pushState(state, "", url);
  } catch (e) {
    historyUsable = false;
  }
}

function safeReplaceState(state, url) {
  if (!historyUsable) return;
  try {
    history.replaceState(state, "", url);
  } catch (e) {
    historyUsable = false;
  }
}

const pageHome = document.getElementById("page-home");
const pagePost = document.getElementById("page-post");
const pageListings = document.getElementById("page-listings");
const pageSearch = document.getElementById("page-search");
const pageMyListings = document.getElementById("page-mylistings");
const listingsAreaTitle = document.getElementById("listingsAreaTitle");
const listingsGrid = document.getElementById("listingsGrid");
const myListingsGrid = document.getElementById("myListingsGrid");
const myListingsFloatBtn = document.getElementById("myListingsFloatBtn");

// ---- Area field: type-to-search combobox ----
// Why a combobox and not a plain <select>: with ~50 areas now on the list,
// scrolling a native dropdown is more friction than typing three letters.
// Why not a free <input> alone: we still need every submission to resolve
// to one of the known AREAS entries (that's what the board/search/area
// pages are keyed on), so typing alone must not be enough to submit.
const areaInput = document.getElementById("areaInput");
const areaHidden = document.getElementById("areaSelect"); // hidden field, holds the validated value
const areaDropdown = document.getElementById("areaDropdown");
const blockSelect = document.getElementById("blockSelect");
const blockOtherRow = document.getElementById("blockOtherRow");
const blockOtherInput = document.getElementById("blockOtherInput");

function areaMatches(query) {
  const q = query.trim().toLowerCase();
  if (!q) return AREAS;
  const starts = AREAS.filter(a => a.name.toLowerCase().startsWith(q));
  const contains = AREAS.filter(a => !a.name.toLowerCase().startsWith(q) && a.name.toLowerCase().includes(q));
  return [...starts, ...contains].slice(0, 10);
}

function renderAreaDropdown(query) {
  const matches = areaMatches(query);
  if (!matches.length) {
    areaDropdown.innerHTML = `<div class="area-combobox-empty">No area matches "${query}" — check the spelling</div>`;
    areaDropdown.hidden = false;
    return;
  }
  // Expat-tier areas still sort first (see AREAS comment above), just
  // without a visible section header splitting the list.
  areaDropdown.innerHTML = matches
    .map(a => `<button type="button" class="area-combobox-item" data-name="${a.name}">${a.name}</button>`)
    .join("");
  areaDropdown.hidden = false;
}

// Populates the block dropdown for the given area: numbered blocks 1..N
// (see AREA_BLOCK_COUNTS above for what's confirmed vs. a generic default),
// plus a permanent "Other / not listed" option that reveals a free-text
// fallback field.
function populateBlockSelect(areaName) {
  if (!blockSelect) return;
  const count = areaName ? blockCountFor(areaName) : DEFAULT_BLOCK_COUNT;
  const opts = [`<option value="" disabled selected>Select a block</option>`];
  for (let i = 1; i <= count; i++) opts.push(`<option value="Block ${i}">Block ${i}</option>`);
  opts.push(`<option value="${OTHER_BLOCK_VALUE}">Other / not listed</option>`);
  blockSelect.innerHTML = opts.join("");
  if (blockOtherRow) blockOtherRow.hidden = true;
  if (blockOtherInput) blockOtherInput.value = "";
}

if (blockSelect) {
  blockSelect.addEventListener("change", () => {
    const isOther = blockSelect.value === OTHER_BLOCK_VALUE;
    if (blockOtherRow) blockOtherRow.hidden = !isOther;
    if (isOther && blockOtherInput) blockOtherInput.focus();
  });
}

// Resolves the block value that actually gets submitted: the selected
// "Block N", or whatever the user typed under "Other".
function getBlockValue() {
  if (!blockSelect) return "";
  if (blockSelect.value === OTHER_BLOCK_VALUE) return (blockOtherInput?.value || "").trim();
  return blockSelect.value || "";
}

function selectArea(name) {
  areaInput.value = name;
  areaHidden.value = name;
  areaDropdown.hidden = true;
  setFieldError("areaError", "");
  populateBlockSelect(name);
}

populateBlockSelect(""); // seed with the generic range before any area is picked

if (areaInput) {
  areaInput.addEventListener("input", () => {
    areaHidden.value = ""; // typing invalidates any prior exact match until it's re-confirmed
    renderAreaDropdown(areaInput.value);
  });
  areaInput.addEventListener("focus", () => renderAreaDropdown(areaInput.value));
  areaInput.addEventListener("blur", () => {
    // small delay so a click on a dropdown item registers before it's hidden
    setTimeout(() => {
      areaDropdown.hidden = true;
      const exact = AREAS.find(a => a.name.toLowerCase() === areaInput.value.trim().toLowerCase());
      if (exact) {
        areaInput.value = exact.name; // normalise casing
        areaHidden.value = exact.name;
        populateBlockSelect(exact.name);
      } else if (areaInput.value.trim()) {
        areaHidden.value = "";
        setFieldError("areaError", "Please pick an area from the list");
      }
    }, 150);
  });
  areaDropdown.addEventListener("mousedown", (e) => {
    const btn = e.target.closest(".area-combobox-item");
    if (btn) selectArea(btn.dataset.name);
  });
}

// ---- Consent checkbox ----
// Lives on the review step — by the time someone reaches review, they've
// already filled in the whole form, so this is the natural last checkpoint
// before anything is written to the database. This checkbox gates publish:
// no consent, no write. It resets to unchecked whenever a fresh posting or
// editing session starts (see resetPostForm / handleEditClick), so it always
// means "I agree, for this listing" rather than carrying over stale state —
// but it isn't re-cleared on every trip back and forth between the form and
// the review step within the same session, so fixing a typo before
// confirming doesn't force re-ticking it.
const consentCheckbox = document.getElementById("consentCheckbox");
const consentError = document.getElementById("consentError");

function resetConsentCheckbox() {
  if (consentCheckbox) consentCheckbox.checked = false;
  setFieldError("consentError", "");
}

if (consentCheckbox) {
  consentCheckbox.addEventListener("change", () => {
    if (consentCheckbox.checked) setFieldError("consentError", "");
  });
}

// ---- Report a listing ----
// Dedup is client-side only (localStorage) — see report_listing() in
// schema.sql for why that's an acceptable tradeoff without accounts.
const REPORTED_KEY = "kwetu_reported_v1";
function getReportedIds() {
  try { return new Set(JSON.parse(localStorage.getItem(REPORTED_KEY) || "[]")); }
  catch (e) { return new Set(); }
}
function markReported(id) {
  try {
    const ids = getReportedIds();
    ids.add(id);
    localStorage.setItem(REPORTED_KEY, JSON.stringify([...ids]));
  } catch (e) { /* private browsing — dedup just won't persist */ }
}

async function handleReportClick(btn, id) {
  if (btn.disabled) return;
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = "Reporting…";
  if (typeof reportListing !== "function" || typeof isSupabaseConfigured !== "function" || !isSupabaseConfigured()) {
    btn.textContent = "Couldn't connect";
    setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 2000);
    return;
  }
  const { error } = await reportListing(id);
  if (error) {
    btn.textContent = "Couldn't connect";
    setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 2000);
    return;
  }
  markReported(id);
  btn.textContent = "Reported ✓";
  btn.classList.add("listing-report--done");
}

// Delegated click handler covers every place listing cards get rendered
// (board, search, overlay) without wiring a listener per card.
document.addEventListener("click", (e) => {
  const reportBtn = e.target.closest(".listing-report");
  if (reportBtn && reportBtn.dataset.id) {
    handleReportClick(reportBtn, reportBtn.dataset.id);
  }
});

// ---- My Listings: view/edit/delete listings this browser has posted ----
// Same localStorage store the post flow already writes to (kwetu_edit_tokens_v1:
// { [listingId]: editToken }). There are no accounts, so "your" listings are
// simply whatever this browser remembers posting — matches the rest of the
// site's no-login philosophy instead of bolting on a separate concept.
const EDIT_TOKENS_KEY = "kwetu_edit_tokens_v1";

function getEditTokenStore() {
  try { return JSON.parse(localStorage.getItem(EDIT_TOKENS_KEY) || "{}"); }
  catch (e) { return {}; }
}
function setEditTokenStore(store) {
  try { localStorage.setItem(EDIT_TOKENS_KEY, JSON.stringify(store)); }
  catch (e) { /* private browsing — store just won't persist */ }
}
function forgetListingToken(id) {
  const store = getEditTokenStore();
  delete store[id];
  setEditTokenStore(store);
}

// Tracks which listing is currently being edited via the Post page, so the
// shared review-and-confirm flow knows whether to create or update. null
// means "posting a brand-new listing" (the default/original behaviour).
let editContext = null; // { id, editToken } | null

function resetPostFormForCreate() {
  editContext = null;
  const title = document.getElementById("postPageTitle");
  const reviewTitle = document.getElementById("reviewTitle");
  const submitBtn = document.getElementById("postSubmitBtn");
  const confirmBtn = document.getElementById("reviewConfirmBtn");
  if (title) title.textContent = "Post your room";
  if (reviewTitle) reviewTitle.textContent = "Review before you publish";
  if (submitBtn) submitBtn.textContent = "Publish";
  if (confirmBtn) confirmBtn.textContent = "Confirm and publish";
  postForm.reset();
  areaHidden.value = "";
  populateBlockSelect("");
  clearFieldErrors();
  resetConsentCheckbox();
}

// Fills the (already-existing) Post form/fields with a listing's current
// values, then flips the page into "edit" mode. Reuses every field, the
// combobox, the block selector and the review veil as-is — editing is just
// "post the form, but update instead of create" from here on.
function prefillPostFormForEdit(listing, editToken) {
  editContext = { id: listing.id, editToken };

  selectArea(listing.area || "");
  const blockOptionExists = listing.block && Array.from(blockSelect.options).some(o => o.value === listing.block);
  if (blockOptionExists) {
    blockSelect.value = listing.block;
    if (blockOtherRow) blockOtherRow.hidden = true;
  } else if (listing.block) {
    blockSelect.value = OTHER_BLOCK_VALUE;
    if (blockOtherRow) blockOtherRow.hidden = false;
    if (blockOtherInput) blockOtherInput.value = listing.block;
  }

  document.getElementById("typeSelect").value = listing.type || "";
  document.getElementById("descriptionInput").value = listing.description || "";
  document.getElementById("rentInput").value = listing.rent_kwd != null ? listing.rent_kwd : "";

  const ccSelect = document.getElementById("ccSelect");
  const phoneInput = document.getElementById("phoneInput");
  const knownCC = Array.from(ccSelect.options).map(o => o.value).find(cc => (listing.whatsapp_e164 || "").startsWith(cc));
  if (knownCC) {
    ccSelect.value = knownCC;
    phoneInput.value = (listing.whatsapp_e164 || "").slice(knownCC.length);
  } else {
    phoneInput.value = (listing.whatsapp_e164 || "").replace(/^\+/, "");
  }

  resetConsentCheckbox();

  const title = document.getElementById("postPageTitle");
  const reviewTitle = document.getElementById("reviewTitle");
  const submitBtn = document.getElementById("postSubmitBtn");
  const confirmBtn = document.getElementById("reviewConfirmBtn");
  if (title) title.textContent = "Edit your listing";
  if (reviewTitle) reviewTitle.textContent = "Review your changes";
  if (submitBtn) submitBtn.textContent = "Save changes";
  if (confirmBtn) confirmBtn.textContent = "Save changes";
}

async function handleEditClick(id) {
  const store = getEditTokenStore();
  const editToken = store[id];
  if (!editToken || typeof getListingForOwner !== "function" || typeof beginListingEdit !== "function") return;

  const { data: listing, error: fetchError } = await getListingForOwner(id, editToken);
  if (fetchError || !listing) return;

  const { error: leaseError } = await beginListingEdit(id, editToken);
  if (leaseError) return;

  prefillPostFormForEdit(listing, editToken);
  showPost();
  document.getElementById("reviewVeil").classList.remove("open");
  safePushState({ page: "post" }, "#post-room");
}

// ---- Delete a listing (confirm veil, same visual language as review-veil) ----
const deleteVeil = document.getElementById("deleteVeil");
const deleteCancelBtn = document.getElementById("deleteCancelBtn");
const deleteConfirmBtn = document.getElementById("deleteConfirmBtn");
let pendingDeleteId = null;

function openDeleteVeil(id) {
  pendingDeleteId = id;
  if (deleteVeil) deleteVeil.classList.add("open");
}
function closeDeleteVeil() {
  pendingDeleteId = null;
  if (deleteVeil) deleteVeil.classList.remove("open");
}
if (deleteCancelBtn) deleteCancelBtn.addEventListener("click", closeDeleteVeil);
if (deleteVeil) {
  deleteVeil.addEventListener("click", (e) => { if (e.target === deleteVeil) closeDeleteVeil(); });
}
if (deleteConfirmBtn) {
  deleteConfirmBtn.addEventListener("click", async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    const store = getEditTokenStore();
    const editToken = store[id];
    if (!editToken || typeof deleteListing !== "function") { closeDeleteVeil(); return; }

    deleteConfirmBtn.disabled = true;
    deleteConfirmBtn.textContent = "Removing…";
    const { error } = await deleteListing(id, editToken);
    deleteConfirmBtn.disabled = false;
    deleteConfirmBtn.textContent = "Remove listing";

    if (error) {
      const note = document.getElementById("deleteNote");
      if (note) note.textContent = "Couldn't remove the listing right now — please try again.";
      return;
    }

    forgetListingToken(id);
    closeDeleteVeil();
    loadMyListings();
  });
}

// Card markup for a listing the visitor themselves posted: same base
// .listing-card look, but with Edit/Delete instead of the public
// report icon, since owners don't report their own listings.
function renderMyListingCard(item, editToken) {
  const card = document.createElement("div");
  card.className = "listing-card";
  const waNumber = (item.whatsapp_e164 || "").replace(/[^\d]/g, "");
  const statusNote = item.status === "reported"
    ? `<span class="mylisting-status mylisting-status--reported">Hidden from the board &mdash; reported by ${item.report_count || 3}+ people</span>`
    : "";
  card.innerHTML = `
    <span class="listing-date">Posted on ${formatListingDate(item.created_at)}</span>
    ${item.type ? `<span class="listing-type">${item.type}</span>` : ""}
    <p class="listing-desc">${item.description || ""}</p>
    <div class="listing-footer">
      <div class="listing-footer-top">
        <span>
          <span class="listing-area">${item.area || ""}</span>
          <span class="listing-sep">&middot;</span>
          <span class="listing-block">${item.block || "Block not listed"}</span>
        </span>
        ${item.rent_kwd != null ? `<span class="listing-rent">${item.rent_kwd} KD/month</span>` : ""}
      </div>
      <a class="listing-phone" href="https://wa.me/${waNumber}" target="_blank" rel="noopener">${item.whatsapp_e164 || ""}</a>
    </div>
    ${statusNote}
    <div class="listing-card-icons mylisting-actions">
      <button type="button" class="mylisting-edit" data-id="${item.id}">✎ Edit</button>
      <button type="button" class="mylisting-delete" data-id="${item.id}">🗑 Delete</button>
    </div>
  `;
  return card;
}

async function loadMyListings() {
  if (!myListingsGrid) return;
  const store = getEditTokenStore();
  const ids = Object.keys(store);

  if (ids.length === 0) {
    myListingsGrid.innerHTML = `<p class="listings-empty">You haven't posted anything from this device yet. <button type="button" class="listings-empty-cta" id="myListingsPostCta">Post a room</button></p>`;
    const cta = document.getElementById("myListingsPostCta");
    if (cta) cta.addEventListener("click", () => goToPost());
    return;
  }

  myListingsGrid.innerHTML = `<p class="listings-empty">Loading your listings…</p>`;

  if (typeof getListingForOwner !== "function" || typeof isSupabaseConfigured !== "function" || !isSupabaseConfigured()) {
    myListingsGrid.innerHTML = `<p class="listings-empty">Couldn't connect to the listings database. Please try again shortly.</p>`;
    return;
  }

  const results = await Promise.all(ids.map(async (id) => {
    const { data, error } = await getListingForOwner(id, store[id]);
    return { id, data, error };
  }));

  myListingsGrid.innerHTML = "";
  const found = results.filter(r => r.data && !r.error);

  if (found.length === 0) {
    myListingsGrid.innerHTML = `<p class="listings-empty">None of your posted listings could be loaded &mdash; they may have expired and been cleaned up.</p>`;
    return;
  }

  found
    .sort((a, b) => new Date(b.data.created_at) - new Date(a.data.created_at))
    .forEach(({ id, data }) => myListingsGrid.appendChild(renderMyListingCard(data, store[id])));
}

// Delegated handlers, same pattern as the public report button.
document.addEventListener("click", (e) => {
  const editBtn = e.target.closest(".mylisting-edit");
  if (editBtn && editBtn.dataset.id) handleEditClick(editBtn.dataset.id);

  const deleteBtn = e.target.closest(".mylisting-delete");
  if (deleteBtn && deleteBtn.dataset.id) openDeleteVeil(deleteBtn.dataset.id);
});

// The actual page-swap. Always runs regardless of whether the History API is
// usable, so navigation itself never breaks — only the URL bar / browser-back
// integration is affected in a sandboxed environment. There are now three
// pages (home, post, listings); this hides all of them before showing one.
//
// Also clears the "view-home" body class, which controls whether the header
// is nudged left or centered (see .topbar-inner .brand in style.css) — every
// non-home page shows a back arrow near the logo, so the header centers
// itself there to avoid the two overlapping. showHome() re-adds the class.
function hideAllPages() {
  pageHome.hidden = true;
  pagePost.hidden = true;
  pageListings.hidden = true;
  if (pageSearch) pageSearch.hidden = true;
  if (pageMyListings) pageMyListings.hidden = true;
  document.body.classList.remove("view-home");
}

// The floating "My Listings" button follows every page except the My
// Listings page itself (no point linking to the page you're already on) —
// mirrors how the back-float button already only shows on sub-pages.
function syncMyListingsFloatVisibility() {
  if (!myListingsFloatBtn) return;
  myListingsFloatBtn.hidden = !pageMyListings.hidden;
}

function showHome() {
  hideAllPages();
  pageHome.hidden = false;
  document.body.classList.add("view-home");
  syncMyListingsFloatVisibility();
  window.scrollTo({ top: 0, behavior: "instant" });
}

function showPost() {
  hideAllPages();
  pagePost.hidden = false;
  syncMyListingsFloatVisibility();
  window.scrollTo({ top: 0, behavior: "instant" });
}

function showListingsPage() {
  hideAllPages();
  pageListings.hidden = false;
  syncMyListingsFloatVisibility();
  window.scrollTo({ top: 0, behavior: "instant" });
}

function showSearchPage() {
  hideAllPages();
  if (pageSearch) pageSearch.hidden = false;
  syncMyListingsFloatVisibility();
  window.scrollTo({ top: 0, behavior: "instant" });
}

function showMyListingsPage() {
  hideAllPages();
  if (pageMyListings) pageMyListings.hidden = false;
  syncMyListingsFloatVisibility();
  window.scrollTo({ top: 0, behavior: "instant" });
}

function goToPost() {
  resetPostFormForCreate();
  showPost();
  document.getElementById("reviewVeil").classList.remove("open");
  safePushState({ page: "post" }, "#post-room");
}

function goToSearch() {
  showSearchPage();
  safePushState({ page: "search" }, "#search");
}

function goToHome() {
  showHome();
  safePushState({ page: "home" }, "#");
}

function goToMyListings() {
  showMyListingsPage();
  loadMyListings();
  safePushState({ page: "mylistings" }, "#my-listings");
}

if (myListingsFloatBtn) myListingsFloatBtn.addEventListener("click", goToMyListings);

document.querySelectorAll("[data-open-post]").forEach((btn) => {
  btn.addEventListener("click", () => goToPost());
});

// Back arrow: try a real browser "back" first (keeps the URL/device back
// gesture in sync on a real deployment); if the History API isn't usable,
// fall back to swapping the page directly so the button still works.
function goBack() {
  if (historyUsable) {
    try {
      history.back();
      return;
    } catch (e) {
      historyUsable = false;
    }
  }
  showHome();
}
document.getElementById("postBackBtn").addEventListener("click", goBack);
document.getElementById("listingsBackBtn").addEventListener("click", goBack);
const searchBackBtn = document.getElementById("searchBackBtn");
if (searchBackBtn) searchBackBtn.addEventListener("click", goBack);
const mylistingsBackBtn = document.getElementById("mylistingsBackBtn");
if (mylistingsBackBtn) mylistingsBackBtn.addEventListener("click", goBack);

// Handles the browser/device back button, not just our own arrows.
window.addEventListener("popstate", (e) => {
  if (e.state && e.state.page === "post") {
    showPost();
  } else if (e.state && e.state.page === "search") {
    showSearchPage();
  } else if (e.state && e.state.page === "listings") {
    showListingsPage();
    if (e.state.area) loadAreaListings(e.state.area);
  } else if (e.state && e.state.page === "mylistings") {
    showMyListingsPage();
    loadMyListings();
  } else {
    showHome();
  }
});

document.addEventListener("keydown", (e) => {
  const onSubPage = !pagePost.hidden || !pageListings.hidden || (pageMyListings && !pageMyListings.hidden);
  if (e.key === "Escape" && onSubPage) goBack();
});

const postForm = document.getElementById("postForm");
const reviewVeil = document.getElementById("reviewVeil");
const postFormNote = document.getElementById("postFormNote");

function setFieldError(id, message) {
  const el = document.getElementById(id);
  if (el) el.textContent = message || "";
}

function clearFieldErrors() {
  ["areaError", "blockError", "typeError", "descriptionError", "phoneError"].forEach((id) => setFieldError(id, ""));
}

// Step 1: validate, then show the review step. Nothing is published here —
// this only decides whether the user gets to see a summary of what they're
// about to post.
postForm.addEventListener("submit", (e) => {
  e.preventDefault();
  clearFieldErrors();

  const areaValue = areaHidden.value;
  const blockValue = getBlockValue();
  const typeValue = document.getElementById("typeSelect").value;
  const descriptionValue = document.getElementById("descriptionInput").value.trim();
  const phoneValue = document.getElementById("phoneInput").value.trim();

  let isValid = true;
  if (!areaValue) {
    setFieldError("areaError", areaInput.value.trim() ? "Please pick an area from the list" : "Please select an Area");
    isValid = false;
  }
  if (!blockValue) {
    setFieldError("blockError", blockSelect.value === OTHER_BLOCK_VALUE ? "Please type the block or street" : "Please select the block");
    isValid = false;
  }
  if (!typeValue) {
    setFieldError("typeError", "Please select accommodation type");
    isValid = false;
  }
  if (!descriptionValue) {
    setFieldError("descriptionError", "describe your accommodation here");
    isValid = false;
  }
  if (!phoneValue) {
    setFieldError("phoneError", "Please enter your WhatsApp number");
    isValid = false;
  }
  if (!isValid) return;

  // Populate the review summary from the now-validated field values.
  const rentValue = document.getElementById("rentInput").value.trim();
  const ccValue = document.getElementById("ccSelect").value;

  document.getElementById("reviewArea").textContent = areaValue;
  document.getElementById("reviewBlock").textContent = blockValue || "—";
  document.getElementById("reviewType").textContent = typeValue;
  document.getElementById("reviewDescription").textContent = descriptionValue;
  document.getElementById("reviewPhone").textContent = `${ccValue} ${phoneValue}`;

  const reviewRentRow = document.getElementById("reviewRentRow");
  if (rentValue) {
    document.getElementById("reviewRent").textContent = `${rentValue} KD/month`;
    reviewRentRow.hidden = false;
  } else {
    reviewRentRow.hidden = true;
  }

  postFormNote.textContent = "";
  reviewVeil.classList.add("open");
});

// "Edit" — teal, matches the site's secondary action color — closes the
// review overlay and returns focus to the form, which was never hidden
// behind it, with everything the user already typed still intact.
document.getElementById("reviewEditBtn").addEventListener("click", () => {
  reviewVeil.classList.remove("open");
});

// Click outside the card, or Escape, also dismisses back to editing.
reviewVeil.addEventListener("click", (e) => {
  if (e.target === reviewVeil) reviewVeil.classList.remove("open");
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && reviewVeil.classList.contains("open")) {
    reviewVeil.classList.remove("open");
  }
});

// "Confirm and publish" — amber, the site's primary action color — is the
// only place that actually writes the listing.
document.getElementById("reviewConfirmBtn").addEventListener("click", async () => {
  const confirmBtn = document.getElementById("reviewConfirmBtn");

  if (!consentCheckbox || !consentCheckbox.checked) {
    setFieldError("consentError", "Please agree to the Terms of Service and Privacy Policy to continue");
    if (consentCheckbox) consentCheckbox.focus();
    return;
  }
  setFieldError("consentError", "");

  const goBackShortly = () => {
    setTimeout(() => {
      if (historyUsable) {
        try {
          history.back();
          return;
        } catch (err) {
          historyUsable = false;
        }
      }
      showHome();
    }, 900);
  };

  const isEditing = !!editContext;
  const writeFn = isEditing ? updateListing : createListing;
  if (typeof isSupabaseConfigured !== "function" || !isSupabaseConfigured() || typeof writeFn !== "function") {
    postFormNote.textContent = "Couldn't connect to the listings database — please try again shortly.";
    postFormNote.style.color = "#C97878";
    return;
  }

  const ccValue = document.getElementById("ccSelect").value;
  const phoneValue = document.getElementById("phoneInput").value.trim();

  confirmBtn.disabled = true;
  confirmBtn.textContent = isEditing ? "Saving…" : "Publishing…";

  const areaAtSubmit = areaHidden.value;

  const payload = {
    area: areaAtSubmit,
    block: getBlockValue() || null,
    type: document.getElementById("typeSelect").value,
    description: document.getElementById("descriptionInput").value.trim(),
    rentKwd: document.getElementById("rentInput").value.trim() ? Number(document.getElementById("rentInput").value) : null,
    whatsappE164: `${ccValue}${phoneValue.replace(/\s+/g, "")}`,
  };

  const { data, error } = isEditing
    ? await updateListing(editContext.id, editContext.editToken, payload)
    : await createListing(payload);

  if (error) {
    console.error("[Kwetu] publish/save RPC failed:", error);
    confirmBtn.disabled = false;
    confirmBtn.textContent = isEditing ? "Save changes" : "Confirm and publish";
    const friendly = isEditing
      ? "Couldn't save your changes — the 10-minute edit window may have expired. Try Edit again from My Listings."
      : "Something went wrong publishing your listing — please try again.";
    // TEMPORARY: shows the raw backend error under the friendly message so
    // the real cause is visible on-screen (helpful on mobile, where dev
    // tools aren't handy). Remove the debugLine part once root-caused.
    const debugLine = error.message ? `\n(debug: ${error.message})` : "";
    postFormNote.textContent = friendly + debugLine;
    postFormNote.style.color = "#C97878";
    postFormNote.style.whiteSpace = "pre-line";
    return;
  }

  // Remember this listing's id + edit token locally so its owner can edit
  // it later — this is the only place the raw token ever exists outside
  // the moment it was generated. (When editing, the token's already stored.)
  if (!isEditing && data && data.id && data.editToken) {
    const store = getEditTokenStore();
    store[data.id] = data.editToken;
    setEditTokenStore(store);
  }

  confirmBtn.textContent = isEditing ? "Saved ✓" : "Listing posted ✓";
  resetConsentCheckbox();
  goBackShortly();
});

// Land on the right page directly if someone opens/refreshes with a deep link
if (location.hash === "#post-room") {
  safeReplaceState({ page: "post" }, "#post-room");
  showPost();
} else if (location.hash.startsWith("#area-")) {
  const slug = location.hash.replace("#area-", "");
  const matchedArea = AREAS.find((a) => a.name.toLowerCase() === slug);
  if (matchedArea) {
    safeReplaceState({ page: "listings", area: matchedArea.name }, location.hash);
    showListingsPage();
    loadAreaListings(matchedArea.name);
  } else {
    safeReplaceState({ page: "home" }, "#");
  }
} else if (location.hash === "#my-listings") {
  safeReplaceState({ page: "mylistings" }, "#my-listings");
  showMyListingsPage();
  loadMyListings();
} else {
  safeReplaceState({ page: "home" }, "#");
}
syncMyListingsFloatVisibility();

// ---- Search for a room -> scroll to area grid ----
// Override the old scroll-to behavior: open overlay for search
document.querySelectorAll("[data-scroll-to]").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    goToSearch();
  });
});

// --- Area overlay logic ---
const areaOverlay = document.getElementById("areaOverlay");
const overlayAreaGrid = document.getElementById("overlayAreaGrid");
const overlayResults = document.getElementById("overlayResults");

let _overlayPreviouslyFocused = null;
let _overlayKeydownHandler = null;
let _overlayState = 'areas'; // 'areas' or 'listings'

function openAreaOverlay() {
  areaOverlay.hidden = false;
  areaOverlay.setAttribute('aria-hidden','false');
  renderOverlayAreas(AREAS);
  overlayResults.hidden = true;
  overlayAreaGrid.hidden = false;
  _overlayState = 'areas';
  // lock background scroll: store current scroll and fix body
  try {
    const sy = window.scrollY || window.pageYOffset || 0;
    document.body.dataset.prevScroll = String(sy);
    document.body.style.position = 'fixed';
    document.body.style.top = `-${sy}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
  } catch (e) {}

  // store previously focused element so we can restore on close
  try { _overlayPreviouslyFocused = document.activeElement; } catch (e) { _overlayPreviouslyFocused = null; }

  // create a real search input in the overlay header so users can type
  const overlayTitle = document.getElementById('overlayTitle');
  renderOverlaySearchInput();

  // focus trap: handle Tab and Escape while overlay is open
  _overlayKeydownHandler = function(e) {
    if (e.key === 'Escape') { closeAreaOverlay(); return; }
    if (e.key !== 'Tab') return;
    const focusable = areaOverlay.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
    const nodes = Array.from(focusable).filter(n => n.offsetParent !== null);
    if (nodes.length === 0) return;
    let idx = nodes.indexOf(document.activeElement);
    if (e.shiftKey) {
      if (idx === -1 || idx === 0) { nodes[nodes.length - 1].focus(); e.preventDefault(); }
    } else {
      if (idx === -1 || idx === nodes.length - 1) { nodes[0].focus(); e.preventDefault(); }
    }
  };
  document.addEventListener('keydown', _overlayKeydownHandler);
}

function closeAreaOverlay() {
  areaOverlay.hidden = true;
  areaOverlay.setAttribute('aria-hidden','true');
  // restore page scroll
  try {
    const prev = Number(document.body.dataset.prevScroll || 0);
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    delete document.body.dataset.prevScroll;
    window.scrollTo(0, prev);
  } catch (e) {}
  // remove focus trap and restore focus
  try {
    if (_overlayKeydownHandler) document.removeEventListener('keydown', _overlayKeydownHandler);
    _overlayKeydownHandler = null;
    if (_overlayPreviouslyFocused && typeof _overlayPreviouslyFocused.focus === 'function') _overlayPreviouslyFocused.focus();
    _overlayPreviouslyFocused = null;
  } catch (e) {}
}

// area overlay back button (replaces the close X)
const areaOverlayBackBtn = document.getElementById("areaOverlayBack");
if (areaOverlayBackBtn) {
  areaOverlayBackBtn.addEventListener('click', () => {
    if (_overlayState === 'listings') {
      // go back to the areas list inside the overlay
      _overlayState = 'areas';
      overlayResults.hidden = true;
      overlayAreaGrid.hidden = false;
      renderOverlayAreas(AREAS);
      renderOverlaySearchInput();
      return;
    }
    closeAreaOverlay();
    goToHome();
  });
}

function renderOverlayAreas(list) {
  overlayAreaGrid.innerHTML = "";
  list.forEach((a) => {
    const btn = document.createElement('button');
    btn.className = 'area-card';
    btn.type = 'button';
    btn.textContent = `${a.name} — ${a.open} open`;
    btn.addEventListener('click', () => {
      // show listings inside the overlay (borrow page-listings behaviour)
      showOverlayListings(a.name);
    });
    overlayAreaGrid.appendChild(btn);
  });
}

async function showOverlayListings(areaName) {
  _overlayState = 'listings';
  // update header title
  const overlayTitle = document.getElementById('overlayTitle');
  overlayTitle.innerHTML = `<div class="overlay-area-title">${areaName}</div>`;
  // hide area list and show results pane
  overlayAreaGrid.hidden = true;
  overlayResults.hidden = false;

  overlayResults.innerHTML = `<p class="listings-empty">Loading listings…</p>`;

  if (typeof fetchListingsByArea === 'function' && typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
    try {
      const { data, error } = await fetchListingsByArea(areaName);
      if (error) {
        overlayResults.innerHTML = `<p class="listings-empty">Couldn't load listings right now.</p>`;
        return;
      }
      const mapped = (data || []).map((row) => ({ id: row.id, type: row.type, description: row.description, block: row.block, area: row.area, rentKwd: row.rent_kwd, whatsapp: row.whatsapp_e164, createdAt: row.created_at }));
      renderListingsToContainer(mapped, overlayResults);
    } catch (e) {
      overlayResults.innerHTML = `<p class="listings-empty">Couldn't load listings right now.</p>`;
    }
  } else {
    overlayResults.innerHTML = `<p class="listings-empty">Couldn't connect to the listings database.</p>`;
  }

  // (no history push here to keep overlay behaviour isolated)
}

function renderOverlaySearchInput() {
  const overlayTitle = document.getElementById('overlayTitle');
  overlayTitle.innerHTML = '';
  const input = document.createElement('input');
  input.type = 'search';
  input.id = 'overlaySearchInput';
  input.placeholder = 'Search areas or keywords';
  input.className = 'overlay-search-input';
  overlayTitle.appendChild(input);
  input.focus();

  input.addEventListener('input', (ev) => {
    const q = ev.target.value.trim();
    if (!q) {
      overlayResults.hidden = true;
      renderOverlayAreas(AREAS);
      return;
    }
    performTextSearch(q);
  });
}

// Type filter buttons
document.querySelectorAll('.type-filter').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.type-filter').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    const t = b.getAttribute('data-type');
    if (t === 'All') {
      overlayResults.hidden = true;
      renderOverlayAreas(AREAS);
    } else {
      performTypeSearch(t);
    }
  });
});

// Note: search input is created dynamically inside `openAreaOverlay`

// Reads every active listing straight from Supabase. No demo data — an
// empty or unreachable database just means an empty result set.
async function gatherAllListings() {
  let all = [];
  if (typeof fetchActiveListings === 'function' && typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
    try {
      const { data, error } = await fetchActiveListings();
      if (!error && data) {
        data.forEach(row => {
          all.push({ id: row.id, area: row.area, type: row.type, description: row.description, block: row.block, rentKwd: row.rent_kwd, whatsapp: row.whatsapp_e164, createdAt: row.created_at });
        });
      }
    } catch (e) {}
  }
  return all;
}

// Bottom-right icon row for a listing card: just the report flag.
function cardIconsHtml(item) {
  const reportedAlready = item.id && getReportedIds().has(item.id);
  const reportBtn = item.id
    ? `<button type="button" class="listing-report${reportedAlready ? ' listing-report--done' : ''}" data-id="${item.id}" aria-label="Report this listing" title="Report this listing">${reportedAlready ? 'Reported ✓' : '⚑ Report'}</button>`
    : '';
  if (!reportBtn) return '';
  return `<div class="listing-card-icons">${reportBtn}</div>`;
}

// render listings into overlayResults
function renderListingsToContainer(list, container) {
  container.innerHTML = '';
  if (!list || list.length === 0) {
    container.innerHTML = '<p class="listings-empty">No listings found.</p>';
    container.hidden = false;
    return;
  }
  list.forEach(item => {
    const card = document.createElement('div');
    card.className = 'listing-card';
    const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : 'insert date';
    const desc = highlightText(item.description||'', currentSearchHighlightQuery);
    card.innerHTML = `
      <span class="listing-date">Posted on ${date}</span>
      ${item.type?`<span class="listing-type">${item.type}</span>`:''}
      <p class="listing-desc">${desc}</p>
      <div class="listing-footer">
        <div class="listing-footer-top">
          <span>
            <span class="listing-area">${item.area||''}</span>
            <span class="listing-sep">&middot;</span>
            <span class="listing-block">${item.block||'Block not listed'}</span>
          </span>
          ${item.rentKwd != null ? `<span class="listing-rent">${item.rentKwd} KD/month</span>` : ''}
        </div>
        <a class="listing-phone" href="https://wa.me/${(item.whatsapp||'').replace(/\D/g,'')}" target="_blank" rel="noopener">${item.whatsapp||''}</a>
      </div>
      ${cardIconsHtml(item)}
    `;
    container.appendChild(card);
  });
  container.hidden = false;
}

// fuzzy matching helper (Levenshtein)
function levenshtein(a,b){
  if(!a||!b) return (a||b)?Math.max(a.length,b.length):0;
  a=a.toLowerCase(); b=b.toLowerCase();
  const m=a.length,n=b.length; const dp=Array(m+1).fill().map(()=>Array(n+1).fill(0));
  for(let i=0;i<=m;i++)dp[i][0]=i; for(let j=0;j<=n;j++)dp[0][j]=j;
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++) dp[i][j]=Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  return dp[m][n];
}

async function performTextSearch(q){
  const all = await gatherAllListings();
  const results = all.filter(item=>{
    const hay = `${item.area||''} ${item.type||''} ${item.description||''}`.toLowerCase();
    if(hay.includes(q.toLowerCase())) return true;
    // check each token in query against hay with small levenshtein
    const tokens = q.toLowerCase().split(/\s+/);
    return tokens.some(t=>{
      if(t.length<3) return hay.includes(t);
      // find closest word in hay
      return hay.split(/\s+/).some(w=>levenshtein(w,t)<=2);
    });
  });
  renderListingsToContainer(results, overlayResults);
}

async function performTypeSearch(type){
  const all = await gatherAllListings();
  const results = all.filter(item=> (item.type||'').toLowerCase() === type.toLowerCase());
  renderListingsToContainer(results, overlayResults);
}

// ---- "How it works" cards: clickable shortcuts to Post / Search ----
const howPostCard = document.getElementById("howPostCard");
const howSearchCard = document.getElementById("howSearchCard");

function activatePostCard() {
  goToPost();
}
function activateSearchCard() {
  howSearchCard.querySelector(".how-tag").classList.add("tag-clicked");
  document.getElementById("board-areas").scrollIntoView({ behavior: "smooth" });
}

[howPostCard, howSearchCard].forEach((card) => {
  const action = card === howPostCard ? activatePostCard : activateSearchCard;
  card.addEventListener("click", action);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  });
});

// Brighten with the matching CTA colour + slight magnify only while the
// user is actively scrolling THROUGH the card's middle — not just whenever
// it's anywhere on screen. rootMargin shrinks the observer's "viewport" to
// a thin band across the vertical center, so the highlight switches on as
// a card crosses that center band and off again once it's passed through.
const howCardObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle("in-view", entry.isIntersecting);
    });
  },
  { threshold: 0, rootMargin: "-42% 0px -42% 0px" }
);
[howPostCard, howSearchCard].forEach((card) => howCardObserver.observe(card));

// ---- Area listings page: cards fed from Supabase, demo data as fallback ----

// Each area page gets its own observer instance since its cards are rebuilt
// every time a different area is opened; the previous one is disconnected
// first so it doesn't keep watching cards that no longer exist.
let listingsObserver = null;

function renderListingCards(list) {
  listingsGrid.innerHTML = "";
  if (listingsObserver) listingsObserver.disconnect();

  if (!list || list.length === 0) {
    listingsGrid.innerHTML = `<p class="listings-empty">No listings posted in this area yet — check back soon, or be the first to post one.</p>`;
    return;
  }

  list.forEach((item) => {
    const card = document.createElement("div");
    card.className = "listing-card";
    const waNumber = item.whatsapp.replace(/[^\d]/g, "");
    const waText = encodeURIComponent(`Hi, I saw your listing on Kwetu Kuwait for a room in ${item.area || listingsAreaTitle.textContent}.`);
    const desc = highlightText(item.description || '', currentSearchHighlightQuery);
    card.innerHTML = `
      <span class="listing-date">Posted on ${formatListingDate(item.createdAt)}</span>
      ${item.type ? `<span class="listing-type">${item.type}</span>` : ""}
      <p class="listing-desc">${desc}</p>
      <div class="listing-footer">
        <div class="listing-footer-top">
          <span>
            <span class="listing-area">${item.area || listingsAreaTitle.textContent}</span>
            <span class="listing-sep">&middot;</span>
            <span class="listing-block">${item.block || "Block not listed"}</span>
          </span>
          ${item.rentKwd != null ? `<span class="listing-rent">${item.rentKwd} KD/month</span>` : ''}
        </div>
        <a class="listing-phone" href="https://wa.me/${waNumber}?text=${waText}" target="_blank" rel="noopener">${item.whatsapp}</a>
      </div>
      ${cardIconsHtml(item)}
    `;
    listingsGrid.appendChild(card);
  });

  listingsObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => entry.target.classList.toggle("in-view", entry.isIntersecting));
    },
    { threshold: 0, rootMargin: "-42% 0px -42% 0px" }
  );
  listingsGrid.querySelectorAll(".listing-card").forEach((c) => listingsObserver.observe(c));
}

// Reads listings for one area straight from Supabase — no demo/fallback
// data. Shows a loading state while the request is in flight.
async function loadAreaListings(areaName) {
  listingsAreaTitle.textContent = areaName;
  listingsGrid.innerHTML = `<p class="listings-empty">Loading listings…</p>`;

  if (typeof fetchListingsByArea !== "function" || typeof isSupabaseConfigured !== "function" || !isSupabaseConfigured()) {
    listingsGrid.innerHTML = `<p class="listings-empty">Couldn't connect to the listings database. Please try again shortly.</p>`;
    return;
  }
  try {
    const { data, error } = await fetchListingsByArea(areaName);
    if (error) {
      listingsGrid.innerHTML = `<p class="listings-empty">Couldn't load listings right now. Please try again shortly.</p>`;
      return;
    }
    renderListingCards(
      (data || []).map((row) => ({
        id: row.id,
        type: row.type,
        description: row.description,
        block: row.block,
        area: row.area,
        rentKwd: row.rent_kwd,
        whatsapp: row.whatsapp_e164,
        createdAt: row.created_at,
      }))
    );
  } catch (e) {
    listingsGrid.innerHTML = `<p class="listings-empty">Couldn't load listings right now. Please try again shortly.</p>`;
  }
}

function openAreaListings(areaName) {
  showListingsPage();
  loadAreaListings(areaName);
  safePushState({ page: "listings", area: areaName }, `#area-${areaName.toLowerCase()}`);
}

// ---- Resume where the user left off (localStorage, 24hr TTL) ----
// No accounts on Kwetu, so this can't be a server-side session — it has to
// live in the visitor's own browser. localStorage is the right tool here:
// unlike sessionStorage it survives closing the tab/app, and unlike a plain
// cookie it doesn't get sent to a server that doesn't need it. We stamp
// every save with Date.now() and just check the age on the way back in —
// that's what gives us the 24hr expiry without needing any backend.
const RESUME_KEY = "kwetu_resume_v1";
const RESUME_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function saveResumeState() {
  try {
    localStorage.setItem(
      RESUME_KEY,
      JSON.stringify({ scrollY: window.scrollY, ts: Date.now() })
    );
  } catch (e) {
    /* storage unavailable (private browsing, etc.) — fail silently */
  }
}

function restoreResumeState() {
  if (pageHome.hidden) return; // came in on #post-room — leave that scroll at top
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return;
    const { scrollY, ts } = JSON.parse(raw);
    if (Date.now() - ts > RESUME_TTL_MS) {
      localStorage.removeItem(RESUME_KEY); // stale — older than 24hrs
      return;
    }
    window.scrollTo({ top: scrollY, behavior: "instant" });
  } catch (e) {
    /* corrupt or unavailable — ignore and start fresh */
  }
}

// Save on the ways a mobile/desktop tab actually disappears
window.addEventListener("pagehide", saveResumeState);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") saveResumeState();
});

restoreResumeState();
