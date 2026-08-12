// ---- Kuwait areas + placeholder open-listing counts ----
const AREAS = [
  { name: "Salmiya",    open: 14, status: "open" },
  { name: "Hawally",    open: 9,  status: "open" },
  { name: "Farwaniya",  open: 3,  status: "few"  },
  { name: "Jabriya",    open: 6,  status: "open" },
  { name: "Fahaheel",   open: 0,  status: "full" },
  { name: "Mangaf",     open: 5,  status: "open" },
  { name: "Khaitan",    open: 2,  status: "few"  },
  { name: "Abbassiya",  open: 7,  status: "open" },
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
  Abbassiya: ["Block 1", "Block 2", "Block 3", "Block 4"],
  Other: [],
};

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
    card.addEventListener("click", () => {
      // Placeholder: this is where filtered results will render once listing detail views exist
      card.style.borderColor = "var(--teal)";
    });
    areaGrid.appendChild(card);
  });
}

// Render demo data immediately so the page never looks empty while the
// network request (if any) is in flight, then swap in live counts once
// Supabase responds — and silently keep the demo data if it's not configured
// or the request fails.
renderAreas(buildAreasData(null));
if (typeof fetchAreaCounts === "function" && typeof isSupabaseConfigured === "function" && isSupabaseConfigured()) {
  fetchAreaCounts()
    .then(({ data, error }) => {
      if (!error && data) renderAreas(buildAreasData(data));
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
const areaSelect = document.getElementById("areaSelect");
const blockSelect = document.getElementById("blockSelect");

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

// The actual page-swap. This always runs regardless of whether the History
// API is usable, so navigation itself never breaks — only the URL bar /
// browser-back integration is affected in a sandboxed environment.
function showPost() {
  pageHome.hidden = true;
  pagePost.hidden = false;
  window.scrollTo({ top: 0, behavior: "instant" });
}

function showHome() {
  pagePost.hidden = true;
  pageHome.hidden = false;
  window.scrollTo({ top: 0, behavior: "instant" });
}

function goToPost() {
  showPost();
  safePushState({ page: "post" }, "#post-room");
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
document.getElementById("postBackBtn").addEventListener("click", () => {
  if (historyUsable) {
    try {
      history.back();
      return;
    } catch (e) {
      historyUsable = false;
    }
  }
  showHome();
});

// Handles the browser/device back button, not just our own arrow.
window.addEventListener("popstate", (e) => {
  if (e.state && e.state.page === "post") {
    showPost();
  } else {
    showHome();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !pagePost.hidden) {
    if (historyUsable) {
      try {
        history.back();
        return;
      } catch (err) {
        historyUsable = false;
      }
    }
    showHome();
  }
});

document.getElementById("postForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = e.target.querySelector("button[type=submit]");
  const note = document.getElementById("postFormNote");

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
    submitBtn.textContent = "Listing posted ✓";
    goBackShortly();
    return;
  }

  const ccValue = document.getElementById("ccSelect").value;
  const phoneValue = document.getElementById("phoneInput").value.trim();

  submitBtn.disabled = true;
  submitBtn.textContent = "Publishing…";

  const { error } = await createListing({
    area: areaSelect.value,
    block: blockSelect.value || null,
    type: document.getElementById("typeSelect").value,
    description: document.getElementById("descriptionInput").value.trim(),
    rentKwd: Number(document.getElementById("rentInput").value),
    whatsappE164: `${ccValue}${phoneValue.replace(/\s+/g, "")}`,
  });

  if (error) {
    submitBtn.disabled = false;
    submitBtn.textContent = "Publish listing";
    note.textContent = "Something went wrong publishing your listing — please try again.";
    note.style.color = "#C97878";
    return;
  }

  submitBtn.textContent = "Listing posted ✓";
  goBackShortly();
});

// Land on the post page directly if someone opens/refreshes with #post-room
if (location.hash === "#post-room") {
  safeReplaceState({ page: "post" }, "#post-room");
  showPost();
} else {
  safeReplaceState({ page: "home" }, "#");
}

// ---- Search for a room -> scroll to area grid ----
document.querySelectorAll("[data-scroll-to]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.getElementById("board-areas").scrollIntoView({ behavior: "smooth" });
  });
});

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
