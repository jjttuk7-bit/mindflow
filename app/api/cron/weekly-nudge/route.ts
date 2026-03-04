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

  return NextResponse.json({ nudgesCreated })
}
