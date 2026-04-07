import pg from "pg";
const { Client } = pg;

const DB_PASSWORD = process.env.DB_PASSWORD;
const PROJECT_REF = process.env.PROJECT_REF;

if (!DB_PASSWORD || !PROJECT_REF) {
  console.error("Missing required env vars: DB_PASSWORD, PROJECT_REF");
  process.exit(1);
}

// Try both direct and pooler connections
const connections = [
  {
    name: "direct",
    connectionString: `postgresql://postgres:${encodeURIComponent(DB_PASSWORD)}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
    ssl: { rejectUnauthorized: false },
  },
  {
    name: "pooler-transaction",
    connectionString: `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(DB_PASSWORD)}@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`,
    ssl: { rejectUnauthorized: false },
  },
  {
    name: "pooler-session",
    connectionString: `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(DB_PASSWORD)}@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres`,
    ssl: { rejectUnauthorized: false },
  },
  {
    name: "pooler-us-east-1",
    connectionString: `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(DB_PASSWORD)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
    ssl: { rejectUnauthorized: false },
  },
  {
    name: "pooler-ap-southeast-1",
    connectionString: `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(DB_PASSWORD)}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
    ssl: { rejectUnauthorized: false },
  },
];

async function tryConnect(config) {
  const client = new Client({
    connectionString: config.connectionString,
    ssl: config.ssl,
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log(`✅ Connected via ${config.name}`);
    return client;
  } catch (err) {
    console.log(`❌ ${config.name}: ${err.message}`);
    return null;
  }
}

async function main() {
  let client = null;

  // Try each connection
  for (const config of connections) {
    client = await tryConnect(config);
    if (client) break;
  }

  if (!client) {
    console.log("\n❌ Could not connect to database with any method.");
    console.log("The database password might be different from the dashboard password.");
    process.exit(1);
  }

  try {
    // Step 1: Check if user_id column already exists
    console.log("\n--- Checking if user_id column exists ---");
    const colCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'items' AND column_name = 'user_id';
    `);

    if (colCheck.rows.length > 0) {
      console.log("✅ user_id column already exists!");

      // Just need to reload PostgREST schema cache
      console.log("\n--- Reloading PostgREST schema cache ---");
      await client.query("NOTIFY pgrst, 'reload schema';");
      console.log("✅ NOTIFY pgrst sent - schema cache will reload!");
    } else {
      console.log("❌ user_id column does NOT exist. Running full migration...");

      // Run full migration
      const migrationSQL = `
        -- 1. Add user_id column
        ALTER TABLE items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

        -- 2. Delete existing test data
        DELETE FROM item_tags;
        DELETE FROM shared_items;
        DELETE FROM items;
        DELETE FROM tags;

        -- 3. Add NOT NULL constraint + index
        ALTER TABLE items ALTER COLUMN user_id SET NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
      `;

      await client.query(migrationSQL);
      console.log("✅ Migration: user_id column added");

      // Drop old RLS policies
      const dropPolicies = `
        DROP POLICY IF EXISTS "Allow all on items" ON items;
        DROP POLICY IF EXISTS "Allow all on tags" ON tags;
        DROP POLICY IF EXISTS "Allow all on item_tags" ON item_tags;
        DROP POLICY IF EXISTS "Allow all on shared_items" ON shared_items;
      `;
      await client.query(dropPolicies);
      console.log("✅ Old RLS policies dropped");

      // Create new RLS policies for items
      await client.query(`CREATE POLICY "Users can view own items" ON items FOR SELECT USING (user_id = auth.uid());`);
      await client.query(`CREATE POLICY "Users can insert own items" ON items FOR INSERT WITH CHECK (user_id = auth.uid());`);
      await client.query(`CREATE POLICY "Users can update own items" ON items FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());`);
      await client.query(`CREATE POLICY "Users can delete own items" ON items FOR DELETE USING (user_id = auth.uid());`);
      await client.query(`CREATE POLICY "Anyone can view shared items" ON items FOR SELECT USING (id IN (SELECT item_id FROM shared_items));`);
      console.log("✅ Items RLS policies created");

      // Tags policies
      await client.query(`CREATE POLICY "Authenticated users can read tags" ON tags FOR SELECT USING (auth.role() = 'authenticated');`);
      await client.query(`CREATE POLICY "Authenticated users can insert tags" ON tags FOR INSERT WITH CHECK (auth.role() = 'authenticated');`);
      await client.query(`CREATE POLICY "Authenticated users can update tags" ON tags FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');`);
      await client.query(`CREATE POLICY "Authenticated users can delete tags" ON tags FOR DELETE USING (auth.role() = 'authenticated');`);
      console.log("✅ Tags RLS policies created");

      // Item_tags policies
      await client.query(`CREATE POLICY "Users can view own item_tags" ON item_tags FOR SELECT USING (item_id IN (SELECT id FROM items WHERE user_id = auth.uid()));`);
      await client.query(`CREATE POLICY "Users can insert own item_tags" ON item_tags FOR INSERT WITH CHECK (item_id IN (SELECT id FROM items WHERE user_id = auth.uid()));`);
      await client.query(`CREATE POLICY "Users can delete own item_tags" ON item_tags FOR DELETE USING (item_id IN (SELECT id FROM items WHERE user_id = auth.uid()));`);
      console.log("✅ Item_tags RLS policies created");

      // Shared_items policies
      await client.query(`CREATE POLICY "Users can share own items" ON shared_items FOR INSERT WITH CHECK (item_id IN (SELECT id FROM items WHERE user_id = auth.uid()));`);
      await client.query(`CREATE POLICY "Anyone can view shared_items" ON shared_items FOR SELECT USING (true);`);
      await client.query(`CREATE POLICY "Users can delete own shared_items" ON shared_items FOR DELETE USING (item_id IN (SELECT id FROM items WHERE user_id = auth.uid()));`);
      console.log("✅ Shared_items RLS policies created");

      // Update match_items function
      await client.query(`
        CREATE OR REPLACE FUNCTION match_items(
          query_embedding vector(768),
          match_threshold float default 0.3,
          match_count int default 10
        )
        RETURNS TABLE (
          id uuid, type text, content text, summary text, metadata jsonb, created_at timestamptz, similarity float
        )
        LANGUAGE plpgsql
        AS $$
        BEGIN
          RETURN QUERY
          SELECT items.id, items.type, items.content, items.summary, items.metadata, items.created_at,
            1 - (items.embedding <=> query_embedding) AS similarity
          FROM items
          WHERE items.embedding IS NOT NULL
            AND items.user_id = auth.uid()
            AND 1 - (items.embedding <=> query_embedding) > match_threshold
          ORDER BY items.embedding <=> query_embedding
          LIMIT match_count;
        END;
        $$;
      `);
      console.log("✅ match_items function updated");

      // Reload PostgREST schema cache
      await client.query("NOTIFY pgrst, 'reload schema';");
      console.log("✅ PostgREST schema cache reloaded");
    }

    // Final verification
    console.log("\n--- Final verification ---");
    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'items'
      ORDER BY ordinal_position;
    `);
    console.log("Items table columns:");
    cols.rows.forEach((r) => console.log(`  ${r.column_name} (${r.data_type}, nullable: ${r.is_nullable})`));

  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await client.end();
  }
}

main();
