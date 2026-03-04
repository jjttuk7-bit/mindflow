import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { detectZombieItems } from "@/lib/zombie-detection"
import { ZOMBIE_THRESHOLDS } from "@/lib/constants"

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getServiceSupabase()

  // Get all users who have items
  const { data: users } = await supabase
    .from("user_settings")
    .select("user_id")

  if (!users || users.length === 0) {
    return NextResponse.json({ message: "No users" })
  }

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  let nudgesCreated = 0

  for (const { user_id } of users) {
    try {
      // Get this week's items with tags
      const { data: items } = await supabase
        .from("items")
        .select("id, item_tags(tags(name))")
        .eq("user_id", user_id)
        .gte("created_at", weekAgo.toISOString())

      if (!items || items.length < 3) continue

      // Count tags
      const tagCount: Record<string, number> = {}
      for (const item of items) {
        const itemTags = (item.item_tags as unknown as { tags: { name: string } }[]) || []
        for (const t of itemTags) {
          if (t.tags?.name) tagCount[t.tags.name] = (tagCount[t.tags.name] || 0) + 1
        }
      }

      const topTags = Object.entries(tagCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)

      if (topTags.length === 0) continue

      const tagList = topTags.map(([name, count]) => `${name}(${count})`).join(", ")

      await supabase.from("nudges").insert({
        user_id,
        type: "trend",
        title: "이번 주 관심사 트렌드",
        content: `지난 7일간 ${items.length}개를 기록했어요. 주요 관심사: ${tagList}`,
        related_item_ids: [],
      })

      nudgesCreated++
    } catch (err) {
      console.error(`Weekly nudge error for user ${user_id}:`, err)
    }

    // ── Stale item check ("아직 필요한가요?") ─────────────────────
    try {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      // Items not accessed in 7+ days (or never accessed and 7+ days old)
      const { data: staleItems } = await supabase
        .from("items")
        .select("id, content, summary, type")
        .eq("user_id", user_id)
        .eq("is_archived", false)
        .is("deleted_at", null)
        .or(`last_accessed_at.is.null,last_accessed_at.lt.${sevenDaysAgo.toISOString()}`)
        .lt("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: true })
        .limit(5)

      if (staleItems && staleItems.length >= 3) {
        const preview = staleItems
          .slice(0, 2)
          .map((i) => `"${(i.summary || i.content || "").slice(0, 30)}..."`)
          .join(", ")

        await supabase.from("nudges").insert({
          user_id,
          type: "action",
          title: "아직 필요한가요?",
          content: `7일 이상 열어보지 않은 항목이 ${staleItems.length}개 있어요: ${preview}`,
          related_item_ids: staleItems.map((i) => i.id),
        })

        nudgesCreated++
      }
    } catch (err) {
      console.error(`Stale nudge error for user ${user_id}:`, err)
    }

    // ── Zombie item detection ──────────────────────────────────────
    try {
      const zombie = await detectZombieItems(supabase, user_id)

      if (zombie.total >= ZOMBIE_THRESHOLDS.MIN_COUNT_FOR_NUDGE) {
        const parts: string[] = []
        if (zombie.links > 0) parts.push(`읽지 않은 링크 ${zombie.links}개`)
        if (zombie.todos > 0) parts.push(`미완료 할 일 ${zombie.todos}개`)
        if (zombie.pins > 0) parts.push(`오래된 핀 ${zombie.pins}개`)

        await supabase.from("nudges").insert({
          user_id,
          type: "zombie",
          title: "\u{1F47B} 잊힌 항목이 있어요",
          content: `${parts.join(", ")}가 방치되고 있어요`,
          related_item_ids: [],
        })

        nudgesCreated++
      }
    } catch (err) {
      console.error(`Zombie nudge error for user ${user_id}:`, err)
    }
  }

  // ── Second pass: interest shift + auto-project suggestion ────────
  for (const { user_id } of users) {
    // 3b. Interest shift detection
    try {
      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

      // Current week tags
      const { data: currItems } = await supabase
        .from("items")
        .select("id, item_tags(tags(name))")
        .eq("user_id", user_id)
        .gte("created_at", weekAgo.toISOString())

      const currTags: Record<string, number> = {}
      for (const item of currItems || []) {
        const tags = (item.item_tags as unknown as { tags: { name: string } }[]) || []
        for (const t of tags) {
          if (t.tags?.name) currTags[t.tags.name] = (currTags[t.tags.name] || 0) + 1
        }
      }

      // Previous week tags
      const { data: prevItems } = await supabase
        .from("items")
        .select("id, item_tags(tags(name))")
        .eq("user_id", user_id)
        .gte("created_at", twoWeeksAgo.toISOString())
        .lt("created_at", weekAgo.toISOString())

      const prevTags: Record<string, number> = {}
      for (const item of prevItems || []) {
        const tags = (item.item_tags as unknown as { tags: { name: string } }[]) || []
        for (const t of tags) {
          if (t.tags?.name) prevTags[t.tags.name] = (prevTags[t.tags.name] || 0) + 1
        }
      }

      // Find newly emerging tags
      const prevTagSet = new Set(Object.keys(prevTags))
      const newTags = Object.entries(currTags)
        .filter(([name, count]) => !prevTagSet.has(name) && count >= 2)
        .map(([name]) => name)

      if (newTags.length > 0) {
        await supabase.from("nudges").insert({
          user_id,
          type: "trend",
          title: "관심사가 변하고 있어요",
          content: `이번 주 새로운 관심사: ${newTags.slice(0, 3).join(", ")}`,
          related_item_ids: [],
        })
        nudgesCreated++
      }
    } catch (err) {
      console.error(`Interest shift nudge error for user ${user_id}:`, err)
    }

    // 3c. Auto project suggestion
    try {
      // Find tags shared by 3+ unorganized items (no project)
      const { data: unorganized } = await supabase
        .from("items")
        .select("id, item_tags(tags(name))")
        .eq("user_id", user_id)
        .is("project_id", null)
        .is("deleted_at", null)
        .eq("is_archived", false)
        .gte("created_at", weekAgo.toISOString())

      const tagItems: Record<string, string[]> = {}
      for (const item of unorganized || []) {
        const tags = (item.item_tags as unknown as { tags: { name: string } }[]) || []
        for (const t of tags) {
          if (t.tags?.name) {
            if (!tagItems[t.tags.name]) tagItems[t.tags.name] = []
            tagItems[t.tags.name].push(item.id)
          }
        }
      }

      // Find tags with 3+ items
      const candidates = Object.entries(tagItems)
        .filter(([, ids]) => ids.length >= 3)
        .sort((a, b) => b[1].length - a[1].length)

      if (candidates.length > 0) {
        const [tagName, itemIds] = candidates[0]
        await supabase.from("nudges").insert({
          user_id,
          type: "action",
          title: `"${tagName}" 프로젝트로 묶을까요?`,
          content: `"${tagName}" 태그가 달린 항목이 ${itemIds.length}개 있어요. 프로젝트로 정리하면 찾기 쉬워요!`,
          related_item_ids: itemIds.slice(0, 5),
        })
        nudgesCreated++
      }
    } catch (err) {
      console.error(`Auto-project nudge error for user ${user_id}:`, err)
    }
  }

  return NextResponse.json({ nudgesCreated })
}
