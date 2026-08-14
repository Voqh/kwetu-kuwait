// Areas displayed on the departure board and in the area grid.
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

// Available blocks for each area.
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

// Combines current listing counts with the standard area list.
function buildAreasData(counts) {
  return AREAS.map((a) => {
    const open = counts && counts[a.name] != null ? counts[a.name] : a.open;
    return { name: a.name, open, status: deriveStatus(open) };
  });
}

// Elements populated with the area data.
const boardRows = document.getElementById("boardRows");
const areaGrid = document.getElementById("areaGrid");

// Renders the departure board and selectable area cards.
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
      card.style.borderColor = "var(--teal)";
    });
    areaGrid.appendChild(card);
  });
}

// Shows initial data, then replaces it with live counts when available.
renderAreas(buildAreasData(null));
if (typeof fetchAreaCounts === "function" && typeof isSupabaseConfigured === "function" && isSupabaseConfigured()) {
  fetchAreaCounts()
    .then(({ data, error }) => {
      if (!error && data) renderAreas(buildAreasData(data));
    })
    .catch(() => {});
}

// Updates the clock displayed on the departure board.
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

let historyUsable = true;

// Prevents navigation failures when browser history is unavailable.
function safePushState(state, url) {
  if (!historyUsable) return;
  try {
    history.pushState(state, "", url);
  } catch (e) {
    historyUsable = false;
  }
}

// Updates the current browser history entry safely.
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

// Shows the post-listing page.
function showPost() {
  pageHome.hidden = true;
  pagePost.hidden = false;
  window.scrollTo({ top: 0, behavior: "instant" });
}

// Returns to the home page.
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

// Supports the browser and device back actions.
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

// Submits a new listing when the form is complete.
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

// Opens the appropriate page for the current URL fragment.
if (location.hash === "#post-room") {
  safeReplaceState({ page: "post" }, "#post-room");
  showPost();
} else {
  safeReplaceState({ page: "home" }, "#");
}

// Scrolls search buttons to the area grid.
document.querySelectorAll("[data-scroll-to]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.getElementById("board-areas").scrollIntoView({ behavior: "smooth" });
  });
});

// Makes the two introductory cards accessible shortcuts.
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

// Highlights a card while it crosses the center of the viewport.
const howCardObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle("in-view", entry.isIntersecting);
    });
  },
  { threshold: 0, rootMargin: "-42% 0px -42% 0px" }
);
[howPostCard, howSearchCard].forEach((card) => howCardObserver.observe(card));

// Stores the visitor's latest home-page scroll position for one day.
const RESUME_KEY = "kwetu_resume_v1";
const RESUME_TTL_MS = 24 * 60 * 60 * 1000;

// Saves the current scroll position.
function saveResumeState() {
  try {
    localStorage.setItem(
      RESUME_KEY,
      JSON.stringify({ scrollY: window.scrollY, ts: Date.now() })
    );
  } catch (e) {}
}

// Restores a recent saved scroll position.
function restoreResumeState() {
  if (pageHome.hidden) return;
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return;
    const { scrollY, ts } = JSON.parse(raw);
    if (Date.now() - ts > RESUME_TTL_MS) {
      localStorage.removeItem(RESUME_KEY);
      return;
    }
    window.scrollTo({ top: scrollY, behavior: "instant" });
  } catch (e) {}
}

window.addEventListener("pagehide", saveResumeState);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") saveResumeState();
});

restoreResumeState();
