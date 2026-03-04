import { createClient, SupabaseClient } from "@supabase/supabase-js"
import {
  generateTags,
  generateSummary,
  generateEmbedding,
  generateInsight,
  generateLinkAnalysis,
  type InsightContext,
} from "@/lib/ai"
import { logger } from "@/lib/logger"

/** Wrap an AI function call with timing and structured logging */
async function tracked<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now()
  try {
    const result = await fn()
    const duration = Date.now() - start
    logger.info(`ai.${name} completed`, { duration, fn: name })
    return result
  } catch (err) {
    const duration = Date.now() - start
    const error = err instanceof Error ? err.message : String(err)
    logger.error(`ai.${name} failed`, { duration, fn: name, error })
    throw err
  }
}

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface EnrichItemOptions {
  /** OG metadata for link items */
  ogTitle?: string
  ogDescription?: string
  /** Source identifier (web, telegram, extension, etc.) */
  source?: string
  /** Recent tag names from same user for pattern detection */
  recentTopics?: string[]
}

interface EnrichResult {
  tags: string[]
  summary: string | null
  embedding: number[] | null
  insight: string | null
  linkAnalysis: string | null
  errors: { fn: string; error: string }[]
}

/**
 * Shared AI enrichment pipeline for items.
 * Called from both /api/items (after()) and /api/ai/tag.
 */
export async function enrichItem(
  itemId: string,
  content: string,
  type: string,
  userId: string,
  supabase: SupabaseClient,
  options?: EnrichItemOptions
): Promise<EnrichResult> {
  const { ogTitle, ogDescription, source = "web", recentTopics } = options || {}

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

  // Detect recent topic patterns — last 5 items' tags
  let detectedTopics = recentTopics
  if (!detectedTopics) {
    const { data: recentItemTags } = await supabase
      .from("items")
      .select("item_tags(tags(name))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5)

    if (recentItemTags?.length) {
      const recentTagCounts = new Map<string, number>()
      for (const item of recentItemTags) {
        const tags = item.item_tags as unknown as Array<{ tags: { name: string } | null }>
        for (const it of tags || []) {
          const name = it.tags?.name
          if (name) recentTagCounts.set(name, (recentTagCounts.get(name) || 0) + 1)
        }
      }
      // Tags appearing in 2+ of last 5 items = active topic
      detectedTopics = [...recentTagCounts.entries()]
        .filter(([, count]) => count >= 2)
        .map(([name]) => name)
    }
  }

  // Build insight context
  const now = new Date()
  const hour = now.getHours()
  const timeOfDay =
    hour < 6 ? "night" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"

  const insightContext: InsightContext = {
    timeOfDay,
    recentTopics: detectedTopics?.length ? detectedTopics : undefined,
  }

  // Run AI tasks in parallel with timing
  const results = await Promise.allSettled([
    tracked("generateTags", () => generateTags(content, type, tagNames, tagNamesWithFreq)),
    tracked("generateSummary", () => generateSummary(content, type)),
    tracked("generateEmbedding", () => generateEmbedding(content)),
    tracked("generateInsight", () => generateInsight(content, type, insightContext)),
  ])

  const suggestedTags = results[0].status === "fulfilled" ? results[0].value : []
  const summary = results[1].status === "fulfilled" ? results[1].value : null
  const embedding = results[2].status === "fulfilled" ? results[2].value : null
  const insight = results[3].status === "fulfilled" ? results[3].value : null

  const fnNames = ["generateTags", "generateSummary", "generateEmbedding", "generateInsight"]
  const errors = results
    .map((r, i) =>
      r.status === "rejected" ? { fn: fnNames[i], error: String(r.reason) } : null
    )
    .filter((e): e is { fn: string; error: string } => e !== null)

  errors.forEach((e) => console.error(`AI enrichment: ${e.fn} failed:`, e.error))

  // Link analysis (separate, only for links)
  let linkAnalysis: string | null = null
  if (type === "link") {
    linkAnalysis = await tracked("generateLinkAnalysis", () =>
      generateLinkAnalysis(content, ogTitle, ogDescription)
    ).catch(() => null)
  }

  // Batch tag upsert — 2 DB calls instead of N
  if (suggestedTags.length > 0) {
    const { data: tags } = await supabase
      .from("tags")
      .upsert(
        suggestedTags.map((name) => ({ name })),
        { onConflict: "name" }
      )
      .select("id, name")

    if (tags && tags.length > 0) {
      await supabase
        .from("item_tags")
        .upsert(
          tags.map((tag) => ({ item_id: itemId, tag_id: tag.id })),
          { onConflict: "item_id,tag_id" }
        )
    }
  }

  // Build update payload
  const updates: Record<string, unknown> = {}
  if (summary) updates.summary = summary
  if (embedding) updates.embedding = JSON.stringify(embedding)

  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
  updates.context = {
    source,
    time_of_day: timeOfDay,
    day_of_week: days[now.getDay()],
    ...(insight ? { ai_comment: insight } : {}),
    ...(linkAnalysis ? { link_analysis: linkAnalysis } : {}),
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from("items").update(updates).eq("id", itemId)
  }

  logger.info("enrichItem completed", {
    itemId,
    type,
    source,
    tags: suggestedTags.length,
    hasSummary: !!summary,
    hasEmbedding: !!embedding,
    hasInsight: !!insight,
    hasLinkAnalysis: !!linkAnalysis,
    errors: errors.length,
  })

  return { tags: suggestedTags, summary, embedding, insight, linkAnalysis, errors }
}

/**
 * Find and create auto-connections based on embedding similarity.
 */
export async function autoConnect(
  itemId: string,
  embedding: number[],
  supabase?: SupabaseClient
): Promise<void> {
  const supa = supabase || getServiceSupabase()

  const { data: similar } = await supa.rpc("find_similar_items", {
    query_embedding: JSON.stringify(embedding),
    query_item_id: itemId,
    match_threshold: 0.55,
    match_count: 5,
  })

  if (similar && similar.length > 0) {
    const connections = similar.map((s: { id: string; similarity: number }) => ({
      source_id: itemId,
      target_id: s.id,
      similarity: s.similarity,
    }))
    await supa
      .from("item_connections")
      .upsert(connections, { onConflict: "source_id,target_id" })
  }
}
