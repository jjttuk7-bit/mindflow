import { getUser } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { SIMILARITY_THRESHOLDS } from "@/lib/constants"

export async function GET() {
  try {
    const { supabase, user } = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Strategy 1: Find old items similar to recent ones
    const { data: recentItems } = await supabase
      .from("items")
      .select("id, embedding, content")
      .eq("user_id", user.id)
      .not("embedding", "is", null)
      .order("created_at", { ascending: false })
      .limit(3)

    if (recentItems && recentItems.length > 0) {
      // Pick a random recent item's embedding to search with
      const seed = recentItems[Math.floor(Math.random() * recentItems.length)]

      const { data: matches } = await supabase.rpc("match_items", {
        query_embedding: seed.embedding,
        match_threshold: SIMILARITY_THRESHOLDS.RESURFACE,
        match_count: 10,
      })

      if (matches && matches.length > 0) {
        // Filter: must be older than 7 days, not the seed item
        const oldMatches = matches.filter((m: { id: string; created_at: string }) =>
          m.id !== seed.id && new Date(m.created_at) < sevenDaysAgo
        )

        if (oldMatches.length > 0) {
          // Pick the best old match
          const picked = oldMatches[0]

          // Get tags for this item
          const { data: tagData } = await supabase
            .from("item_tags")
            .select("tags(id, name)")
            .eq("item_id", picked.id)

          const tags = (tagData || [])
            .map((t: { tags: unknown }) => t.tags)
            .filter(Boolean)

          const daysAgo = Math.floor(
            (Date.now() - new Date(picked.created_at).getTime()) / (1000 * 60 * 60 * 24)
          )

          let reason: string
          if (daysAgo >= 30) {
            const months = Math.floor(daysAgo / 30)
            reason = months === 1 ? "1달 전의 기억" : `${months}달 전의 기억`
          } else {
            reason = `${daysAgo}일 전의 기억`
          }

          return NextResponse.json({
            item: { ...picked, tags },
            reason,
            related_to: seed.content?.slice(0, 50),
          })
        }
      }
    }

    // Strategy 2: Fallback - random old item
    const { data: oldItems } = await supabase
      .from("items")
      .select("*, item_tags(tags(id, name))")
      .eq("user_id", user.id)
      .lt("created_at", sevenDaysAgo.toISOString())
      .eq("is_archived", false)
      .order("created_at", { ascending: true })
      .limit(20)

    if (oldItems && oldItems.length > 0) {
      const picked = oldItems[Math.floor(Math.random() * oldItems.length)]
      const tags = (picked.item_tags as { tags: unknown }[])
        ?.map((t) => t.tags)
        .filter(Boolean) || []

      const daysAgo = Math.floor(
        (Date.now() - new Date(picked.created_at).getTime()) / (1000 * 60 * 60 * 24)
      )

      let reason: string
      if (daysAgo >= 30) {
        const months = Math.floor(daysAgo / 30)
        reason = months === 1 ? "1달 전의 기억" : `${months}달 전의 기억`
      } else {
        reason = `${daysAgo}일 전의 기억`
      }

      return NextResponse.json({
        item: { ...picked, tags, item_tags: undefined },
        reason,
      })
    }

    return NextResponse.json({ item: null })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Resurface error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
