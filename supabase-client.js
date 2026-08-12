// ============================================================
// KWETU KUWAIT — Supabase wiring
// Fill these in from your Supabase project: Settings > API
// ============================================================
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL"; // e.g. https://xxxx.supabase.co
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY"; // safe to expose publicly — RLS does the real enforcement

function isSupabaseConfigured() {
  return (
    SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL" &&
    SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY" &&
    typeof window.supabase !== "undefined"
  );
}

let _client = null;
function getClient() {
  if (!isSupabaseConfigured()) return null;
  if (!_client) _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _client;
}

// ---- Write: create a new listing ----
// payload: { area, block, type, description, rentKwd, whatsappE164 }
async function createListing(payload) {
  const client = getClient();
  if (!client) return { error: { message: "Supabase not configured" } };

  return client.from("listings").insert({
    area: payload.area,
    block: payload.block || null,
    type: payload.type,
    description: payload.description || null,
    rent_kwd: payload.rentKwd,
    whatsapp_e164: payload.whatsappE164,
  });
}

// ---- Read: active, non-expired listings ----
// RLS on the "listings" table already filters to status='active' AND
// expires_at > now() — this query doesn't need to repeat that logic.
async function fetchActiveListings() {
  const client = getClient();
  if (!client) return { data: null, error: { message: "Supabase not configured" } };

  return client.from("listings").select("*").order("created_at", { ascending: false });
}

// ---- Read: listing counts grouped by area (for the board + area grid) ----
async function fetchAreaCounts() {
  const { data, error } = await fetchActiveListings();
  if (error || !data) return { data: null, error };

  const counts = {};
  data.forEach((row) => {
    counts[row.area] = (counts[row.area] || 0) + 1;
  });
  return { data: counts, error: null };
}
