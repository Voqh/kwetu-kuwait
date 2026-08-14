const SUPABASE_URL = "https://gdhxmwftdlkhlwmcafto.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_bvgmerahX7Ubwic2yX81JA_lTJMdItZ";

// Checks whether the client can connect.
function isSupabaseConfigured() {
  return Boolean(
    SUPABASE_URL &&
      SUPABASE_ANON_KEY &&
      typeof window !== "undefined" &&
      window.supabase
  );
}

let _client = null;
function getClient() {
  if (!isSupabaseConfigured()) return null;
  if (!_client) _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _client;
}

function createEditToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Creates a listing
async function createListing(payload) {
  const client = getClient();
  if (!client) return { error: { message: "Supabase not configured" } };

  const editToken = createEditToken();
  const { data, error } = await client.rpc("create_public_listing", {
    p_area: payload.area,
    p_block: payload.block || null,
    p_type: payload.type || null,
    p_description: payload.description || null,
    p_rent_kwd: payload.rentKwd,
    p_whatsapp_e164: payload.whatsappE164,
    p_edit_token: editToken,
  });
  return { data: Array.isArray(data) ? data[0] : data, error, editToken };
}

// Retrieves active listings
async function fetchActiveListings() {
  const client = getClient();
  if (!client) return { data: null, error: { message: "Supabase not configured" } };

  return client.from("listings").select("*").order("created_at", { ascending: false });
}

// Counts active listings for each area
async function fetchAreaCounts() {
  const { data, error } = await fetchActiveListings();
  if (error || !data) return { data: null, error };

  const counts = {};
  data.forEach((row) => {
    counts[row.area] = (counts[row.area] || 0) + 1;
  });
  return { data: counts, error: null };
}