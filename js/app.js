/**
 * KWETU KUWAIT - Main Application Logic
 * Connects the UI to the Supabase client functions.
 */

// --- STATE & ELEMENTS ---
const state = {
  listings: [],
  areas: ['Salmiya', 'Hawally', 'Farwaniya', 'Jabriya', 'Fahaheel', 'Mangaf', 'Khaitan', 'Other']
};

const UI = {
  pages: {
    home: document.getElementById('page-home'),
    post: document.getElementById('page-post'),
    listings: document.getElementById('page-listings')
  },
  boardRows: document.getElementById('boardRows'),
  boardClock: document.getElementById('boardClock'),
  areaGrid: document.getElementById('areaGrid'),
  postForm: document.getElementById('postForm'),
  postFormNote: document.getElementById('postFormNote'),
  listingsGrid: document.getElementById('listingsGrid'),
  listingsAreaTitle: document.getElementById('listingsAreaTitle'),
  
  // Buttons
  btnOpenPost: document.querySelector('[data-open-post]'),
  btnScrollBoard: document.querySelector('[data-scroll-to="board"]'),
  postBackBtn: document.getElementById('postBackBtn'),
  listingsBackBtn: document.getElementById('listingsBackBtn'),
  
  // Form Inputs
  areaSelect: document.getElementById('areaSelect'),
  blockSelect: document.getElementById('blockSelect'),
  typeSelect: document.getElementById('typeSelect'),
  descriptionInput: document.getElementById('descriptionInput'),
  rentInput: document.getElementById('rentInput'),
  ccSelect: document.getElementById('ccSelect'),
  phoneInput: document.getElementById('phoneInput')
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  setupEventListeners();
  startClock();
});

async function initApp() {
  await loadData();
}

function setupEventListeners() {
  // Navigation
  UI.btnOpenPost.addEventListener('click', () => navigateTo('post'));
  UI.postBackBtn.addEventListener('click', () => navigateTo('home'));
  UI.listingsBackBtn.addEventListener('click', () => navigateTo('home'));
  
  UI.btnScrollBoard.addEventListener('click', () => {
    document.getElementById('board').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // Form Logic
  UI.areaSelect.addEventListener('change', handleAreaSelection);
  UI.postForm.addEventListener('submit', handlePostSubmission);
}

// --- DATA FETCHING & RENDERING ---
async function loadData() {
  // fetchActiveListings is defined in your supabase-client.js
  const { data, error } = await fetchActiveListings();
  
  if (error) {
    console.error("Failed to load listings:", error);
    return;
  }
  
  state.listings = data || [];
  renderDepartureBoard();
  renderAreaGrid();
}

// --- DEPARTURE BOARD ---
function renderDepartureBoard() {
  if (!UI.boardRows) return;
  
  UI.boardRows.innerHTML = '';
  // Show the 6 most recent listings on the board
  const recentListings = state.listings.slice(0, 6);
  
  if (recentListings.length === 0) {
    UI.boardRows.innerHTML = `<div class="board-row" style="grid-column: 1/-1; text-align:center;">No active listings found.</div>`;
    return;
  }

  recentListings.forEach((listing, index) => {
    const isNew = (new Date() - new Date(listing.created_at)) < 86400000; // Less than 24h old
    const statusText = isNew ? 'JUST ADDED' : 'AVAILABLE';
    const statusClass = isNew ? 'status-open' : 'status-few';
    
    // Create a flicker effect for text
    const areaFlicker = createFlickerText(listing.area.toUpperCase());
    
    const row = document.createElement('div');
    row.className = 'board-row';
    row.innerHTML = `
      <span class="flicker" style="--d: ${index}">${areaFlicker}</span>
      <span>${listing.type ? listing.type.toUpperCase() : 'ROOM'}</span>
      <span class="${statusClass}">${statusText}</span>
    `;
    UI.boardRows.appendChild(row);
  });
}

function createFlickerText(text) {
  return text.split('').map((char, i) => 
    `<span style="animation-delay: ${Math.random() * 2}s">${char}</span>`
  ).join('');
}

function startClock() {
  setInterval(() => {
    const now = new Date();
    UI.boardClock.textContent = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  }, 1000);
}

// --- AREA GRID ---
function renderAreaGrid() {
  if (!UI.areaGrid) return;
  UI.areaGrid.innerHTML = '';

  // Count listings per area
  const counts = state.listings.reduce((acc, curr) => {
    acc[curr.area] = (acc[curr.area] || 0) + 1;
    return acc;
  }, {});

  state.areas.forEach(area => {
    const count = counts[area] || 0;
    const card = document.createElement('div');
    card.className = 'area-card';
    card.tabIndex = 0;
    card.role = 'button';
    card.innerHTML = `
      <span class="area-card-name">${area}</span>
      <span class="area-card-count">${count} ${count === 1 ? 'Listing' : 'Listings'}</span>
    `;
    
    card.addEventListener('click', () => openAreaListings(area));
    UI.areaGrid.appendChild(card);
  });
}

// --- LISTINGS PAGE ---
function openAreaListings(area) {
  UI.listingsAreaTitle.textContent = area;
  UI.listingsGrid.innerHTML = '';
  
  const areaListings = state.listings.filter(l => l.area === area);
  
  if (areaListings.length === 0) {
    UI.listingsGrid.innerHTML = `<div class="listings-empty">No active listings in ${area} right now. Check back soon.</div>`;
  } else {
    areaListings.forEach(listing => {
      const card = document.createElement('div');
      card.className = 'listing-card';
      
      const date = new Date(listing.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      const phone = `${listing.whatsapp_e164}`;
      const whatsappLink = `https://wa.me/${phone.replace('+', '')}?text=Hi,%20I%20saw%20your%20listing%20on%20Kwetu%20Kuwait%20for%20a%20${listing.type || 'room'}%20in%20${listing.area}.`;

      card.innerHTML = `
        <span class="listing-date">POSTED ${date.toUpperCase()}</span>
        <p class="listing-desc">${escapeHtml(listing.description || `${listing.type} available in ${listing.area}.`)}</p>
        <div class="listing-footer">
          <span class="listing-area">${listing.type ? listing.type + ' • ' : ''}${listing.rent_kwd} KD</span>
          <span class="listing-sep">|</span>
          <span class="listing-block">Block ${listing.block}</span>
          <span class="listing-sep">|</span>
          <a href="${whatsappLink}" target="_blank" class="listing-phone">WhatsApp: ${phone}</a>
        </div>
      `;
      UI.listingsGrid.appendChild(card);
    });
  }
  
  navigateTo('listings');
}

// --- FORM HANDLING ---
function handleAreaSelection() {
  if (UI.areaSelect.value) {
    UI.blockSelect.disabled = false;
    UI.blockSelect.innerHTML = '<option value="" disabled selected>Select block</option>';
    // Populate simple blocks 1-12 for demo purposes
    for(let i=1; i<=12; i++) {
      UI.blockSelect.innerHTML += `<option value="${i}">Block ${i}</option>`;
    }
  }
}

async function handlePostSubmission(e) {
  e.preventDefault();
  
  const submitBtn = UI.postForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  
  submitBtn.disabled = true;
  submitBtn.textContent = 'Publishing...';
  
  const payload = {
    area: UI.areaSelect.value,
    block: UI.blockSelect.value,
    type: UI.typeSelect.value,
    description: UI.descriptionInput.value,
    rentKwd: parseFloat(UI.rentInput.value),
    whatsappE164: UI.ccSelect.value + UI.phoneInput.value.replace(/\D/g, '')
  };

  // createListing is defined in your supabase-client.js
  const response = await createListing(payload);

  if (response.error) {
    UI.postFormNote.textContent = `Error: ${response.error.message}`;
    UI.postFormNote.style.color = '#C97878'; // Error color
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  } else {
    UI.postFormNote.textContent = 'Success! Your listing is now live.';
    UI.postFormNote.style.color = '#1C7C74'; // Teal success
    
    // Refresh data and go home
    await loadData();
    setTimeout(() => {
      UI.postForm.reset();
      UI.blockSelect.disabled = true;
      UI.postFormNote.textContent = 'Your listing goes live immediately and expires in 30 days.';
      UI.postFormNote.style.color = '';
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      navigateTo('home');
    }, 1500);
  }
}

// --- UTILS ---
function navigateTo(pageId) {
  Object.values(UI.pages).forEach(page => {
    if (page) page.hidden = true;
  });
  
  if (UI.pages[pageId]) {
    UI.pages[pageId].hidden = false;
    window.scrollTo(0, 0);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}