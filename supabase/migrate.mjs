import pg from "pg"
import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

// Try multiple pooler regions
const regions = [
  "ap-northeast-2",
  "ap-northeast-1",
  "us-east-1",
  "ap-southeast-1",
  "eu-west-1",
]

let client
for (const region of regions) {
  const host = `aws-0-${region}.pooler.supabase.com`
  console.log(`Trying ${host}...`)
  const c = new pg.Client({
    host,
    port: 5432,
    user: "postgres.goewynhlhlybtcsuaknk",
    password: "GfpYEslURJ1AL61A",
    database: "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  })
  try {
    await c.connect()
    console.log(`Connected via ${host}`)
    client = c
    break
  } catch (err) {
    console.log(`  ✗ ${err.message}`)
  }
}
if (!client) {
  console.error("Could not connect to any pooler region")
  process.exit(1)
}

const files = [
  "schema.sql",
  "schema-ai.sql",
  "schema-content.sql",
  "schema-share.sql",
]

async function migrate() {
  for (const file of files) {
    const sql = readFileSync(join(__dirname, file), "utf-8")
    console.log(`Running ${file}...`)
    try {
      await client.query(sql)
      console.log(`  ✓ ${file} done`)
    } catch (err) {
      console.error(`  ✗ ${file} error:`, err.message)
    }
  }

  await client.end()
  console.log("Migration complete!")
}

migrate().catch((err) => {
  console.error("Fatal:", err.message)
  process.exit(1)
})
