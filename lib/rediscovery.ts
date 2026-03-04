import { SupabaseClient } from "@supabase/supabase-js"
import { SIMILARITY_THRESHOLDS } from "@/lib/constants"

export interface RediscoveryItem {
  item: {
    id: string
    type: string
    content: string
    summary?: string
    created_at: string
    tags?: { id: string; name: string }[]
  }
  reason: string
  related_to?: string
}

function formatDaysAgo(createdAt: string): string {
  const daysAgo = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysAgo >= 30) {
    const months = Math.floor(daysAgo / 30)
    return months === 1 ? "1달 전의 기억" : `${months}달 전의 기억`
  }
  return `${daysAgo}일 전의 기억`
}

async function fetchTagsForItem(
  supabase: SupabaseClient,
  itemId: string
): Promise<{ id: string; name: string }[]> {
  const { data: tagData } = await supabase
    .from("item_tags")
    .select("tags(id, name)")
    .eq("item_id", itemId)

  return (tagData || [])
    .map((t: { tags: unknown }) => t.tags as { id: string; name: string })
    .filter(Boolean)
}

export async function fetchRediscoveries(
  supabase: SupabaseClient,
  userId: string,
  count = 2
): Promise<RediscoveryItem[]> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // 1. Get recent items with embeddings
  const { data: recentItems } = await supabase
    .from("items")
    .select("id, embedding, content")
    .eq("user_id", userId)
    .not("embedding", "is", null)
    .order("created_at", { ascending: false })
    .limit(5)

  const results: RediscoveryItem[] = []
  const seenIds = new Set<string>()

  if (recentItems && recentItems.length > 0) {
    // 2. Pick random seeds (up to `count`)
    const shuffled = [...recentItems].sort(() => Math.random() - 0.5)
    const seeds = shuffled.slice(0, count)

    // 3. For each seed, find similar old items
    for (const seed of seeds) {
      if (results.length >= count) break

      const { data: matches } = await supabase.rpc("match_items", {
        query_embedding: seed.embedding,
        match_threshold: SIMILARITY_THRESHOLDS.RESURFACE,
        match_count: 10,
      })

      if (!matches) continue

      // 4. Filter: older than 7 days, not a seed, not already picked
      const oldMatches = matches.filter(
        (m: { id: string; created_at: string }) =>
          !seenIds.has(m.id) &&
          m.id !== seed.id &&
          !recentItems.some((r) => r.id === m.id) &&
          new Date(m.created_at) < sevenDaysAgo
      )

      if (oldMatches.length > 0) {
        const picked = oldMatches[0]
        seenIds.add(picked.id)

        const tags = await fetchTagsForItem(supabase, picked.id)

        results.push({
          item: {
            id: picked.id,
            type: picked.type,
            content: picked.content,
            summary: picked.summary,
            created_at: picked.created_at,
            tags,
          },
          reason: formatDaysAgo(picked.created_at),
          related_to: seed.content?.slice(0, 50),
        })
      }
    }
  }

  // 5. Fallback: random old items if not enough
  if (results.length < count) {
    const needed = count - results.length
    const excludeIds = [...seenIds, ...(recentItems || []).map((r) => r.id)]

    const { data: oldItems } = await supabase
      .from("items")
      .select("id, type, content, summary, created_at")
      .eq("user_id", userId)
      .eq("is_archived", false)
      .lt("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: true })
      .limit(20)

    if (oldItems) {
      const filtered = oldItems.filter((o) => !excludeIds.includes(o.id))
      const shuffledOld = filtered.sort(() => Math.random() - 0.5)

      for (const picked of shuffledOld.slice(0, needed)) {
        const tags = await fetchTagsForItem(supabase, picked.id)

        results.push({
          item: {
            id: picked.id,
            type: picked.type,
            content: picked.content,
            summary: picked.summary,
            created_at: picked.created_at,
            tags,
          },
          reason: formatDaysAgo(picked.created_at),
        })
      }
    }
  }

  return results
}
