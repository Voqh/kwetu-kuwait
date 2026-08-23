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

// Generates a random 64+ char token used as the one-time "proof of
// ownership" for a listing. It's never stored in the database in plain
// text — only its hash is (see create_public_listing in schema.sql).
// The raw token stays in the visitor's own browser (localStorage), which
// is what lets them edit their own listing later without an account.
function generateEditToken() {
  const bytes = new Uint8Array(48); // 48 bytes -> 64 base64url chars
  (window.crypto || window.msCrypto).getRandomValues(bytes);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Creates a listing via the create_public_listing() RPC — the anon role
// has no direct INSERT grant on the listings table (see schema.sql), so
// this is the only way a browser can create a row.
//
// Note: p_lat/p_lng are no longer sent from the client — the location-pin
// feature was removed. The database function still accepts them (defaulting
// to null) so no schema/migration change was needed to retire this feature;
// see schema.sql for the historical lat/lng columns.
async function createListing(payload) {
  const client = getClient();
  if (!client) return { error: { message: "Supabase not configured" } };

  const editToken = generateEditToken();

  const { data, error } = await client.rpc("create_public_listing", {
    p_area: payload.area,
    p_block: payload.block || "",
    p_type: payload.type || "",
    p_description: payload.description || "",
    p_rent_kwd: payload.rentKwd,
    p_whatsapp_e164: payload.whatsappE164,
    p_edit_token: editToken,
  });

  if (error) return { data: null, error };

  const row = Array.isArray(data) ? data[0] : data;
  return { data: { ...row, editToken }, error: null };
}

// Retrieves active listings, newest first. RLS already limits this to
// status = 'active' and non-expired rows, so no extra filtering is needed
// client-side.
async function fetchActiveListings() {
  const client = getClient();
  if (!client) return { data: null, error: { message: "Supabase not configured" } };

  return client.from("listings").select("*").order("created_at", { ascending: false });
}

// Retrieves active listings for a single area, newest first.
async function fetchListingsByArea(areaName) {
  const client = getClient();
  if (!client) return { data: null, error: { message: "Supabase not configured" } };

  return client
    .from("listings")
    .select("*")
    .eq("area", areaName)
    .order("created_at", { ascending: false });
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

// Opens a 10-minute edit lease on a listing, given the token that was
// handed back (and locally stored) when it was created.
async function beginListingEdit(id, editToken) {
  const client = getClient();
  if (!client) return { data: null, error: { message: "Supabase not configured" } };

  const { data, error } = await client.rpc("begin_public_listing_edit", {
    p_listing_id: id,
    p_edit_token: editToken,
  });
  return { data, error };
}

// Updates an existing listing via the update_public_listing() RPC. Like
// creating a listing, the anon role has no direct UPDATE grant — this
// only succeeds if the edit token matches and the edit lease hasn't
// expired. p_lat/p_lng are no longer sent — see the note on createListing.
async function updateListing(id, editToken, payload) {
  const client = getClient();
  if (!client) return { data: null, error: { message: "Supabase not configured" } };

  const { data, error } = await client.rpc("update_public_listing", {
    p_listing_id: id,
    p_edit_token: editToken,
    p_area: payload.area,
    p_block: payload.block || "",
    p_type: payload.type || "",
    p_description: payload.description || "",
    p_rent_kwd: payload.rentKwd,
    p_whatsapp_e164: payload.whatsappE164,
  });

  return { data, error };
}

// Reports a listing via the report_listing() RPC. anon has no direct write
// access to listing_reports or to listings.report_count — this is the only
// path. Returns the listing's new report_count on success so the caller can
// (optionally) reflect it in the UI; the actual auto-hide threshold logic
// lives server-side in schema.sql, not here.
async function reportListing(id, reason) {
  const client = getClient();
  if (!client) return { data: null, error: { message: "Supabase not configured" } };

  const { data, error } = await client.rpc("report_listing", {
    p_listing_id: id,
    p_reason: reason || null,
  });
  return { data, error };
}

// Fetches one listing on behalf of its owner, proven by their locally-stored
// edit token — via get_listing_for_owner() this works even if the listing
// is currently 'reported' or expired, unlike the public RLS-gated select.
// Powers the "My Listings" page.
async function getListingForOwner(id, editToken) {
  const client = getClient();
  if (!client) return { data: null, error: { message: "Supabase not configured" } };

  const { data, error } = await client.rpc("get_listing_for_owner", {
    p_listing_id: id,
    p_edit_token: editToken,
  });
  if (error) return { data: null, error };

  const row = Array.isArray(data) ? data[0] : data;
  return { data: row || null, error: row ? null : { message: "Not found" } };
}

// Deletes a listing via the delete_public_listing() RPC, given its edit
// token. No edit lease needed — anon still has no direct DELETE grant on
// listings (see schema.sql), so this RPC is the only path.
async function deleteListing(id, editToken) {
  const client = getClient();
  if (!client) return { data: null, error: { message: "Supabase not configured" } };

  const { data, error } = await client.rpc("delete_public_listing", {
    p_listing_id: id,
    p_edit_token: editToken,
  });
  return { data, error };
}
