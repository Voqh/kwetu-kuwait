import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const adminSecret = Deno.env.get("ADMIN_SECRET");

if (!supabaseUrl || !supabaseServiceKey || !adminSecret) {
  throw new Error(
    "Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or ADMIN_SECRET"
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Verify admin secret from request header
function verifyAdmin(req: Request): boolean {
  const authHeader = req.headers.get("x-admin-secret");
  if (!authHeader || authHeader !== adminSecret) {
    return false;
  }
  return true;
}

Deno.serve(async (req: Request) => {
  // Verify admin access
  if (!verifyAdmin(req)) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const listingId = url.searchParams.get("listing_id");

  try {
    if (action === "queue") {
      // List moderation queue (all reported listings)
      // Query admin schema (restricted to service role key)
      const { data, error } = await supabase
        .schema("admin")
        .from("moderation_queue")
        .select("*")
        .limit(100);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, queue: data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "reinstate") {
      if (!listingId) {
        return new Response(
          JSON.stringify({ error: "Missing listing_id" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase.rpc(
        "moderation_reinstate_listing",
        { p_listing_id: listingId }
      );

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, result: data }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      if (!listingId) {
        return new Response(
          JSON.stringify({ error: "Missing listing_id" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase.rpc(
        "moderation_delete_listing",
        { p_listing_id: listingId }
      );

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, result: data }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Moderation error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
