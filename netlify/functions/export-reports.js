// netlify/functions/export-reports.js
// Admin data export: CSV of reports for abuse pattern analysis
// Protected by ADMIN_SECRET header

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminSecret = process.env.ADMIN_SECRET;

if (!supabaseUrl || !supabaseServiceKey || !adminSecret) {
  throw new Error(
    "Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or ADMIN_SECRET"
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Verify admin secret from request header
function verifyAdmin(req) {
  const authHeader = req.headers.get("x-admin-secret");
  if (!authHeader || authHeader !== adminSecret) {
    return false;
  }
  return true;
}

// Convert array of objects to CSV string
function jsonToCSV(data) {
  if (!data || data.length === 0) {
    return "No data";
  }

  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          // Escape quotes and wrap strings containing commas
          if (typeof val === "string" && (val.includes(",") || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val || "";
        })
        .join(",")
    ),
  ].join("\n");

  return csv;
}

export default async (req, context) => {
  // Verify admin access
  if (!verifyAdmin(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Fetch report summary data
    const { data, error } = await supabase
      .from("report_summary")
      .select("*")
      .limit(1000);

    if (error) throw error;

    // Convert to CSV
    const csv = jsonToCSV(data);

    // Return as downloadable CSV
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="kwetu-reports-${new Date()
          .toISOString()
          .split("T")[0]}.csv"`,
      },
    });
  } catch (err) {
    console.error("Export error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
