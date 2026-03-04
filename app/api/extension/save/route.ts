import { getUserFromToken } from "@/lib/auth-token"
import { enrichItem } from "@/lib/ai-enrichment"
import { rateLimit } from "@/lib/rate-limit"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import ogs from "open-graph-scraper"

const saveSchema = z.object({
  url: z.string().url().max(2048),
  title: z.string().max(500).optional(),
  content: z.string().max(50000).optional(),
  note: z.string().max(2000).optional(),
})

async function scrapeOg(url: string) {
  try {
    const { result } = await ogs({ url, timeout: 8000 })
    const ogImage =
      result.ogImage && result.ogImage.length > 0
        ? result.ogImage[0].url
        : undefined
    return {
      og_title: result.ogTitle || undefined,
      og_description: result.ogDescription || undefined,
      og_image: ogImage,
      og_url: result.ogUrl || url,
      og_domain: new URL(url).hostname.replace("www.", ""),
    }
  } catch {
    return {
      og_url: url,
      og_domain: new URL(url).hostname.replace("www.", ""),
    }
  }
}

export async function POST(req: NextRequest) {
  // Rate limit: 10 requests per minute
  const limited = rateLimit(req, { maxRequests: 10, windowMs: 60_000 })
  if (limited) return limited

  // Authenticate via Bearer token
  const { user, supabase, error: authError } = await getUserFromToken(req)
  if (!user || !supabase) {
    return NextResponse.json({ error: authError || "Unauthorized" }, { status: 401 })
  }

  // Validate body
  const raw = await req.json().catch(() => null)
  if (!raw) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = saveSchema.safeParse(raw)
  if (!parsed.success) {
    const messages = parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ")
    return NextResponse.json({ error: "Validation failed", details: messages }, { status: 400 })
  }

  const { url, title, note } = parsed.data

  // Scrape OG metadata
  const ogData = await scrapeOg(url)

  const metadata: Record<string, unknown> = {
    ...ogData,
    source: "chrome_extension",
  }
  if (title) metadata.page_title = title
  if (note) metadata.note = note

  // Insert item
  const { data: item, error: insertError } = await supabase
    .from("items")
    .insert({
      type: "link",
      content: url,
      metadata,
      user_id: user.id,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 })
  }

  // Fire-and-forget AI enrichment
  const m = metadata as Record<string, string>
  const tagContent = [m.og_title, m.og_description, url].filter(Boolean).join(" — ")
  enrichItem(item.id, tagContent, "link", user.id, supabase, {
    ogTitle: m.og_title,
    ogDescription: m.og_description,
    source: "chrome_extension",
  }).catch(() => {})

  return NextResponse.json(
    { success: true, item_id: item.id, title: ogData.og_title || title || url },
    { status: 201 }
  )
}

