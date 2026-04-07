import pg from "pg";
import fs from "fs";
import path from "path";
const { Client } = pg;

const DB_PASSWORD = process.env.DB_PASSWORD;
const PROJECT_REF = process.env.PROJECT_REF;

if (!DB_PASSWORD || !PROJECT_REF) {
  console.error("Missing required env vars: DB_PASSWORD, PROJECT_REF");
  process.exit(1);
}

const connections = [
  {
    name: "pooler-transaction",
    connectionString: `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(DB_PASSWORD)}@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`,
    ssl: { rejectUnauthorized: false },
  },
  {
    name: "direct",
    connectionString: `postgresql://postgres:${encodeURIComponent(DB_PASSWORD)}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
    ssl: { rejectUnauthorized: false },
  },
  {
    name: "pooler-session",
    connectionString: `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(DB_PASSWORD)}@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres`,
    ssl: { rejectUnauthorized: false },
  },
];

const MIGRATION_FILES = [
  "../supabase/migrations/20260306_sales_schema.sql",
  "../supabase/migrations/20260306_sales_notifications.sql",
  "../supabase/migrations/20260306_sales_beta.sql",
];

async function tryConnect(config) {
  const client = new Client({
    connectionString: config.connectionString,
    ssl: config.ssl,
    connectionTimeoutMillis: 10000,
  });
  try {
    await client.connect();
    console.log(`Connected via ${config.name}`);
    return client;
  } catch (err) {
    console.log(`${config.name}: ${err.message}`);
    return null;
  }
}

async function main() {
  let client = null;
  for (const config of connections) {
    client = await tryConnect(config);
    if (client) break;
  }

  if (!client) {
    console.log("\nCould not connect to database.");
    process.exit(1);
  }

  try {
    for (const file of MIGRATION_FILES) {
      const filePath = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")), file);
      console.log(`\n--- Running: ${path.basename(file)} ---`);

      const sql = fs.readFileSync(filePath, "utf-8");

      try {
        await client.query(sql);
      } catch (err) {
        if (err.message.includes("already exists")) {
          console.log(`  (skipped: ${err.message.slice(0, 60)})`);
        } else {
          console.log(`  ERROR: ${err.message.slice(0, 100)}`);
        }
      }
      console.log(`Done: ${path.basename(file)}`);
    }

    // Reload PostgREST schema cache
    await client.query("NOTIFY pgrst, 'reload schema'");
    console.log("\nPostgREST schema cache reloaded");

    // Verify tables
    console.log("\n--- Verification ---");
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('customers', 'deals', 'activities', 'follow_ups', 'customer_items', 'notification_rules', 'sales_alerts', 'beta_signups')
      ORDER BY table_name;
    `);
    console.log("Sales tables created:");
    tables.rows.forEach(r => console.log(`  ${r.table_name}`));

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}

main();
