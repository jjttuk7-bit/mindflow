import { getUserFromToken } from "@/lib/auth-token"
import { generateTags, generateSummary, generateEmbedding } from "@/lib/ai"
import { rateLimit } from "@/lib/rate-limit"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import ogs from "open-graph-scraper"
import type { SupabaseClient } from "@supabase/supabase-js"

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

  // Trigger async AI tagging (fire and forget, inline to avoid cookie auth issues)
  const m = metadata as Record<string, string>
  const tagContent = [m.og_title, m.og_description, url].filter(Boolean).join(" — ")
  runAiTagging(supabase, user.id, item.id, tagContent).catch(() => {})

  return NextResponse.json(
    { success: true, item_id: item.id, title: ogData.og_title || title || url },
    { status: 201 }
  )
}

/** Inline AI tagging using the authenticated supabase client (no cookie needed) */
async function runAiTagging(
  supabase: SupabaseClient,
  userId: string,
  itemId: string,
  content: string
) {
  // Get existing tags for reuse
  const { data: userTagRows } = await supabase
    .from("item_tags")
    .select("tag_id, tags(name), items!inner(user_id)")
    .eq("items.user_id", userId)

  const tagFreqMap = new Map<string, number>()
  for (const row of userTagRows || []) {
    const name = (row.tags as unknown as { name: string })?.name
    if (name) tagFreqMap.set(name, (tagFreqMap.get(name) || 0) + 1)
  }
  const tagNamesWithFreq = [...tagFreqMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name} (${count})`)
  const tagNames = [...tagFreqMap.keys()]

  const [suggestedTags, summary, embedding] = await Promise.all([
    generateTags(content, "link", tagNames, tagNamesWithFreq),
    generateSummary(content),
    generateEmbedding(content),
  ])

  // Upsert tags
  for (const tagName of suggestedTags) {
    const { data: tag } = await supabase
      .from("tags")
      .upsert({ name: tagName }, { onConflict: "name" })
      .select()
      .single()
    if (tag) {
      await supabase
        .from("item_tags")
        .upsert({ item_id: itemId, tag_id: tag.id }, { onConflict: "item_id,tag_id" })
    }
  }

  // Update item with summary, embedding, context
  const updates: Record<string, unknown> = {}
  if (summary) updates.summary = summary
  if (embedding) updates.embedding = JSON.stringify(embedding)

  const now = new Date()
  const hour = now.getHours()
  const timeOfDay =
    hour < 6 ? "night" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
  updates.context = {
    source: "chrome_extension",
    time_of_day: timeOfDay,
    day_of_week: days[now.getDay()],
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from("items").update(updates).eq("id", itemId)
  }
}
