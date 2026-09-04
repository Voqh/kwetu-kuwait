// netlify/functions/purge-listings.js
// Scheduled function: runs daily to clean up expired listings
// Triggered by netlify.toml cron config

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async (req, context) => {
  try {
    // Call the purge RPC with service role key
    const { data, error } = await supabase.rpc("purge_expired_listings");

    if (error) {
      console.error("Purge error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const [result] = data || [];
    const listingsPurged = result?.listings_purged || 0;
    const leasesPurged = result?.leases_purged || 0;

    console.log(
      `Purge complete: ${listingsPurged} listings, ${leasesPurged} leases`
    );

    return new Response(
      JSON.stringify({
        success: true,
        listings_purged: listingsPurged,
        leases_purged: leasesPurged,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Purge function error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message,
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
