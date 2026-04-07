import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const MIGRATION_FILES = [
  "../supabase/migrations/20260306_sales_schema.sql",
  "../supabase/migrations/20260306_sales_notifications.sql",
  "../supabase/migrations/20260306_sales_beta.sql",
];

async function runSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    // Try pg_query via management API
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return await res.json();
}

async function runViaSQL(sql) {
  // Use Supabase SQL endpoint (requires service role)
  const res = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { error: text.slice(0, 200) };
  }
  return await res.json();
}

async function main() {
  console.log("DotLine Sales DB Migration\n");

  for (const file of MIGRATION_FILES) {
    const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));
    const filePath = path.resolve(dir, file);
    const fileName = path.basename(file);
    console.log(`--- ${fileName} ---`);

    const sql = fs.readFileSync(filePath, "utf-8");

    const result = await runViaSQL(sql);
    if (result.error) {
      if (result.error.includes("already exists") || result.error.includes("duplicate")) {
        console.log(`  (skipped: ${result.error.slice(0, 80)})`);
      } else {
        console.log(`  ERR: ${result.error.slice(0, 80)}`);
      }
    } else {
      console.log(`  ok`);
    }
    console.log();
  }

  // Verify tables exist
  console.log("--- Verification ---");
  const tables = ["customers", "deals", "activities", "follow_ups", "customer_items", "notification_rules", "sales_alerts", "beta_signups"];

  for (const table of tables) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id&limit=0`, {
        headers: {
          "apikey": SERVICE_KEY,
          "Authorization": `Bearer ${SERVICE_KEY}`,
        },
      });
      console.log(`  ${table}: ${res.ok ? "OK" : `ERR ${res.status}`}`);
    } catch (err) {
      console.log(`  ${table}: ${err.message}`);
    }
  }
}

main().catch(console.error);
