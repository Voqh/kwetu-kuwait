// ---- Kuwait areas + placeholder open-listing counts ----
const AREAS = [
  { name: "Salmiya",    open: 14, status: "open" },
  { name: "Hawally",    open: 9,  status: "open" },
  { name: "Farwaniya",  open: 3,  status: "few"  },
  { name: "Jabriya",    open: 6,  status: "open" },
  { name: "Fahaheel",   open: 0,  status: "full" },
  { name: "Mangaf",     open: 5,  status: "open" },
  { name: "Khaitan",    open: 2,  status: "few"  },
  { name: "Abbasiya",   open: 7,  status: "open" },
  { name: "Jleeb Al-Shuyoukh", open: 4, status: "open" },
  { name: "Mahboula",   open: 6,  status: "open" },
  { name: "Fintas",     open: 1,  status: "few"  },
  { name: "Abu Halifa", open: 0,  status: "full" },
  { name: "Riggae",     open: 3,  status: "few"  },
];

// ---- Blocks per area (Kuwait addresses are organised by block/qita'a) ----
const AREA_BLOCKS = {
  Salmiya: ["Block 1", "Block 2", "Block 3", "Block 4", "Block 9", "Block 10", "Block 12"],
  Hawally: ["Block 1", "Block 2", "Block 3", "Block 4", "Block 5", "Block 6"],
  Farwaniya: ["Block 1", "Block 2", "Block 3", "Block 4", "Block 5"],
  Jabriya: ["Block 1", "Block 2", "Block 3", "Block 4", "Block 5", "Block 6", "Block 9", "Block 10", "Block 12"],
  Fahaheel: ["Block 1", "Block 2", "Block 3", "Block 4", "Block 5"],
  Mangaf: ["Block 1", "Block 2", "Block 3", "Block 4", "Block 5", "Block 6"],
  Khaitan: ["Block 1", "Block 2", "Block 3", "Block 4", "Block 5"],
  Abbasiya: ["Block 1", "Block 2", "Block 3", "Block 4", "Block 5", "Block 6", "Block 7", "Block 8", "Block 9", "Block 10"],
  "Jleeb Al-Shuyoukh": ["Block 1", "Block 2", "Block 3", "Block 4"],
  Mahboula: ["Block 1", "Block 2", "Block 3", "Block 4", "Block 5", "Block 6"],
  Fintas: ["Block 1", "Block 2", "Block 3", "Block 4"],
  "Abu Halifa": ["Block 1", "Block 2", "Block 3", "Block 4"],
  Riggae: ["Block 1", "Block 2", "Block 3"],
  Other: [],
};

// ---- Demo listings (fallback shown until/unless Supabase has real rows) ----
const DEMO_LISTINGS = {
  Salmiya: [
    { type: "Room", description: "Room available near Lulu Hyper, 10 mins walk from bus stop. Shared kitchen, quiet building, ladies floor only.", block: "Block 3", whatsapp: "+254700123456", createdAt: "2026-08-11" },
    { type: "Partition", description: "Spacious partition in a 2BHK, close to the Salmiya corniche. Good for a working single tenant, own space with curtain divider.", block: "Block 9", whatsapp: "+96550098765", createdAt: "2026-08-08" },
  ],
  Hawally: [
    { type: "Bedspace", description: "Bedspace in a shared room, 3 tenants, walking distance to Hawally co-op. Utilities included, flexible move-in date.", block: "Block 2", whatsapp: "+254722334455", createdAt: "2026-08-12" },
  ],
  Farwaniya: [
    { type: "Apartment", description: "Full room in a family building, near the main souq. AC and wardrobe included, prefer working professional.", block: "Block 4", whatsapp: "+96551122334", createdAt: "2026-08-05" },
  ],
  Jabriya: [
    { type: "Partition", description: "Partition space close to the university area, quiet street, good for students. Wifi included.", block: "Block 10", whatsapp: "+254733445566", createdAt: "2026-08-13" },
    { type: "Apartment", description: "Apartment room to share, modern building with lift, 5 mins to the block 9 mosque.", block: "Block 12", whatsapp: "+96552233445", createdAt: "2026-08-09" },
  ],
  Fahaheel: [],
  Mangaf: [
    { type: "Room", description: "Room near the Mangaf co-op, sea view balcony, shared with one other tenant. Serious inquiries only please.", block: "Block 5", whatsapp: "+254744556677", createdAt: "2026-08-10" },
  ],
  Khaitan: [
    { type: "Bedspace", description: "Bedspace available in a clean, quiet apartment. Close to public transport, ideal for shift workers.", block: "Block 3", whatsapp: "+96553344556", createdAt: "2026-08-07" },
  ],
  Abbasiya: [
    { type: "Bedspace", description: "Bedspace in a shared flat near Abbasiya market, popular with a mixed international crowd. Close to public transport links.", block: "Block 3", whatsapp: "+254755667788", createdAt: "2026-08-06" },
  ],
  "Jleeb Al-Shuyoukh": [
    { type: "Room", description: "Room in a busy residential block, walking distance to the main Jleeb market. Budget-friendly, shared bathroom.", block: "Block 2", whatsapp: "+96554455667", createdAt: "2026-08-13" },
  ],
  Mahboula: [
    { type: "Partition", description: "Partition close to the Mahboula co-op, quiet building, easy access to Fahaheel Expressway. Good for shift workers.", block: "Block 4", whatsapp: "+254766778899", createdAt: "2026-08-12" },
  ],
  Fintas: [],
  "Abu Halifa": [],
  Riggae: [],
  Other: [],
};

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

// Render areas into the dedicated search page grid
const searchAreaGrid = document.getElementById('searchAreaGrid');
function renderSearchAreas(data) {
  if (!searchAreaGrid) return;
  searchAreaGrid.innerHTML = '';
  data.forEach((a) => {
    const btn = document.createElement('button');
    btn.className = 'search-area-card';
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
      renderListingCards(filtered.map(item => ({ type: item.type, description: item.description, block: item.block, area: item.area, whatsapp: item.whatsapp, createdAt: item.createdAt })));
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
    renderListingCards(filtered.map(item => ({
      type: item.type,
      description: item.description,
      block: item.block,
      area: item.area,
      whatsapp: item.whatsapp,
      createdAt: item.createdAt,
    })));
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
    renderListingCards(results.map(item=>({ type: item.type, description: item.description, block: item.block, area: item.area, whatsapp: item.whatsapp, createdAt: item.createdAt })));
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
const areaSelect = document.getElementById("areaSelect");
const blockSelect = document.getElementById("blockSelect");
const listingsAreaTitle = document.getElementById("listingsAreaTitle");
const listingsGrid = document.getElementById("listingsGrid");

function populateBlocks(areaName) {
  const blocks = AREA_BLOCKS[areaName] || [];
  blockSelect.innerHTML = "";
  if (!areaName || blocks.length === 0) {
    blockSelect.disabled = true;
    const opt = document.createElement("option");
    opt.value = "";
    opt.disabled = true;
    opt.selected = true;
    opt.textContent = areaName ? "No blocks listed for this area" : "Select an area first";
    blockSelect.appendChild(opt);
    return;
  }
  blockSelect.disabled = false;
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.disabled = true;
  placeholder.selected = true;
  placeholder.textContent = "Select a block";
  blockSelect.appendChild(placeholder);
  blocks.forEach((b) => {
    const opt = document.createElement("option");
    opt.textContent = b;
    blockSelect.appendChild(opt);
  });
}

areaSelect.addEventListener("change", () => populateBlocks(areaSelect.value));

// The actual page-swap. Always runs regardless of whether the History API is
// usable, so navigation itself never breaks — only the URL bar / browser-back
// integration is affected in a sandboxed environment. There are now three
// pages (home, post, listings); this hides all of them before showing one.
function hideAllPages() {
  pageHome.hidden = true;
  pagePost.hidden = true;
  pageListings.hidden = true;
  if (pageSearch) pageSearch.hidden = true;
}

function showHome() {
  hideAllPages();
  pageHome.hidden = false;
  window.scrollTo({ top: 0, behavior: "instant" });
}

function showPost() {
  hideAllPages();
  pagePost.hidden = false;
  window.scrollTo({ top: 0, behavior: "instant" });
}

function showListingsPage() {
  hideAllPages();
  pageListings.hidden = false;
  window.scrollTo({ top: 0, behavior: "instant" });
}

function showSearchPage() {
  hideAllPages();
  if (pageSearch) pageSearch.hidden = false;
  window.scrollTo({ top: 0, behavior: "instant" });
}

function goToPost() {
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

// Handles the browser/device back button, not just our own arrows.
window.addEventListener("popstate", (e) => {
  if (e.state && e.state.page === "post") {
    showPost();
  } else if (e.state && e.state.page === "search") {
    showSearchPage();
  } else if (e.state && e.state.page === "listings") {
    showListingsPage();
    if (e.state.area) loadAreaListings(e.state.area);
  } else {
    showHome();
  }
});

document.addEventListener("keydown", (e) => {
  const onSubPage = !pagePost.hidden || !pageListings.hidden;
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

  const areaValue = areaSelect.value;
  const blockValue = blockSelect.value;
  const typeValue = document.getElementById("typeSelect").value;
  const descriptionValue = document.getElementById("descriptionInput").value.trim();
  const phoneValue = document.getElementById("phoneInput").value.trim();
  const areaHasBlocks = (AREA_BLOCKS[areaValue] || []).length > 0;

  let isValid = true;
  if (!areaValue) {
    setFieldError("areaError", "Please select an Area");
    isValid = false;
  }
  if (areaHasBlocks && !blockValue) {
    setFieldError("blockError", "Please select the block");
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

  // Not wired to a backend yet — keep the original demo confirmation so the
  // form remains fully testable before Supabase credentials are added.
  if (typeof isSupabaseConfigured !== "function" || !isSupabaseConfigured()) {
    confirmBtn.textContent = "Listing posted ✓";
    goBackShortly();
    return;
  }

  const ccValue = document.getElementById("ccSelect").value;
  const phoneValue = document.getElementById("phoneInput").value.trim();

  confirmBtn.disabled = true;
  confirmBtn.textContent = "Publishing…";

  const { error } = await createListing({
    area: areaSelect.value,
    block: blockSelect.value || null,
    type: document.getElementById("typeSelect").value,
    description: document.getElementById("descriptionInput").value.trim(),
    rentKwd: document.getElementById("rentInput").value.trim() ? Number(document.getElementById("rentInput").value) : null,
    whatsappE164: `${ccValue}${phoneValue.replace(/\s+/g, "")}`,
  });

  if (error) {
    confirmBtn.disabled = false;
    confirmBtn.textContent = "Confirm and publish";
    postFormNote.textContent = "Something went wrong publishing your listing — please try again.";
    postFormNote.style.color = "#C97878";
    return;
  }

  confirmBtn.textContent = "Listing posted ✓";
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
} else {
  safeReplaceState({ page: "home" }, "#");
}

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

  // render demo listings immediately, then try live rows
  const demo = DEMO_LISTINGS[areaName] || [];
  renderListingsToContainer(demo, overlayResults);

  if (typeof fetchListingsByArea === 'function' && typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
    try {
      const { data, error } = await fetchListingsByArea(areaName);
      if (!error && data) {
        const mapped = data.map((row) => ({ type: row.type, description: row.description, block: row.block, area: row.area, whatsapp: row.whatsapp_e164, createdAt: row.created_at }));
        renderListingsToContainer(mapped, overlayResults);
      }
    } catch (e) {}
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

// Helper: flatten listings from DEMO and (if available) Supabase
async function gatherAllListings() {
  let all = [];
  // include demo listings
  Object.keys(DEMO_LISTINGS).forEach(area => {
    (DEMO_LISTINGS[area]||[]).forEach(item => {
      all.push(Object.assign({ area }, item));
    });
  });
  // include live listings if Supabase configured
  if (typeof fetchActiveListings === 'function' && typeof isSupabaseConfigured === 'function' && isSupabaseConfigured()) {
    try {
      const { data, error } = await fetchActiveListings();
      if (!error && data) {
        data.forEach(row => {
          all.push({ area: row.area, type: row.type, description: row.description, block: row.block, whatsapp: row.whatsapp_e164, createdAt: row.created_at });
        });
      }
    } catch (e) {}
  }
  return all;
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
      <div class="listing-meta">
        <span>${item.area||''}</span>
        <span>${item.block||''}</span>
        <a class="listing-phone" href="https://wa.me/${(item.whatsapp||'').replace(/\D/g,'')}" target="_blank" rel="noopener">${item.whatsapp||''}</a>
      </div>
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
        <span class="listing-area">${item.area || listingsAreaTitle.textContent}</span>
        <span class="listing-sep">&middot;</span>
        <span class="listing-block">${item.block || "Block not listed"}</span>
        <span class="listing-sep">&middot;</span>
        <a class="listing-phone" href="https://wa.me/${waNumber}?text=${waText}" target="_blank" rel="noopener">${item.whatsapp}</a>
      </div>
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

// Shows demo data immediately (so the page is never empty while a network
// request is in flight), then swaps in real Supabase rows if configured.
async function loadAreaListings(areaName) {
  listingsAreaTitle.textContent = areaName;
  renderListingCards(DEMO_LISTINGS[areaName] || []);

  if (typeof fetchListingsByArea !== "function" || typeof isSupabaseConfigured !== "function" || !isSupabaseConfigured()) {
    return;
  }
  try {
    const { data, error } = await fetchListingsByArea(areaName);
    if (!error && data && data.length > 0) {
      renderListingCards(
        data.map((row) => ({
          type: row.type,
          description: row.description,
          block: row.block,
          area: row.area,
          whatsapp: row.whatsapp_e164,
          createdAt: row.created_at,
        }))
      );
    }
  } catch (e) {
    /* stay on demo data */
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
