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
// Creates the client once and reuses it for later requests.
function getClient() {
  if (!isSupabaseConfigured()) return null;
  if (!_client) _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _client;
}

// Creates a listing from submitted form values.
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

// Retrieves active listings, newest first.
async function fetchActiveListings() {
  const client = getClient();
  if (!client) return { data: null, error: { message: "Supabase not configured" } };

  return client.from("listings").select("*").order("created_at", { ascending: false });
}

// Counts active listings for each area.
async function fetchAreaCounts() {
  const { data, error } = await fetchActiveListings();
  if (error || !data) return { data: null, error };

  const counts = {};
  data.forEach((row) => {
    counts[row.area] = (counts[row.area] || 0) + 1;
  });
  return { data: counts, error: null };
}
