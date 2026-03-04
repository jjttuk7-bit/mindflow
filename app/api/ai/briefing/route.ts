import { getUser } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { detectZombieItems } from "@/lib/zombie-detection"
import { fetchRediscoveries } from "@/lib/rediscovery"

export async function GET() {
  try {
    const { supabase, user } = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterdayStart = new Date(todayStart)
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)

    // 1. Yesterday's items
    const { data: yesterdayItems } = await supabase
      .from("items")
      .select("id, type, content, summary, created_at")
      .eq("user_id", user.id)
      .gte("created_at", yesterdayStart.toISOString())
      .lt("created_at", todayStart.toISOString())
      .order("created_at", { ascending: false })

    // 2. Today's items so far
    const { data: todayItems } = await supabase
      .from("items")
      .select("id, type")
      .eq("user_id", user.id)
      .gte("created_at", todayStart.toISOString())

    // 3. Pending todos
    const { data: pendingTodos } = await supabase
      .from("todos")
      .select("id, content, due_date, project_id")
      .eq("user_id", user.id)
      .eq("is_completed", false)
      .order("created_at", { ascending: false })
      .limit(5)

    // 4. Overdue todos (due_date < today)
    const { data: overdueTodos } = await supabase
      .from("todos")
      .select("id, content, due_date")
      .eq("user_id", user.id)
      .eq("is_completed", false)
      .lt("due_date", todayStart.toISOString())

    // 5. Total item count for context
    const { count: totalItems } = await supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_archived", false)

    // 6. This week's activity
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - 7)
    const { data: weekItems } = await supabase
      .from("items")
      .select("id, type")
      .eq("user_id", user.id)
      .gte("created_at", weekStart.toISOString())

    // 7. Streak data
    const { data: streakData } = await supabase
      .from("user_streaks")
      .select("current_streak, longest_streak, last_active_date")
      .eq("user_id", user.id)
      .single()

    const streak = streakData || { current_streak: 0, longest_streak: 0, last_active_date: null }

    // 8. Zombie items + Rediscoveries + Unread links (parallelized)
    const threeDaysAgo = new Date(todayStart)
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    const [zombie, rediscoveries, unreadLinksResult] = await Promise.all([
      detectZombieItems(supabase, user.id, todayStart),
      fetchRediscoveries(supabase, user.id, 2),
      supabase
        .from("items")
        .select("id, content, summary, metadata, created_at")
        .eq("user_id", user.id)
        .eq("type", "link")
        .is("last_accessed_at", null)
        .is("deleted_at", null)
        .eq("is_archived", false)
        .lt("created_at", threeDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(3),
    ])

    const unreadLinks = (unreadLinksResult.data || []).map((item) => {
      const meta = item.metadata as Record<string, string> | null
      const daysAgo = Math.floor(
        (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24)
      )
      return {
        id: item.id,
        title: meta?.og_title || item.summary || item.content,
        domain: meta?.og_domain,
        days_ago: daysAgo,
      }
    })

    // Build type counts
    const yesterdayCounts: Record<string, number> = {}
    for (const item of yesterdayItems || []) {
      yesterdayCounts[item.type] = (yesterdayCounts[item.type] || 0) + 1
    }

    const weekCounts: Record<string, number> = {}
    for (const item of weekItems || []) {
      weekCounts[item.type] = (weekCounts[item.type] || 0) + 1
    }

    // Build yesterday summary snippets
    const yesterdaySnippets = (yesterdayItems || []).slice(0, 5).map((item) => ({
      type: item.type,
      text: item.summary || item.content?.slice(0, 80),
    }))

    // Generate personalized greeting (no time-of-day expressions)
    let greeting: string

    if (streak.current_streak >= 7) {
      greeting = `🔥 ${streak.current_streak}일 연속 사용 중! 대단해요`
    } else if (streak.current_streak >= 3) {
      greeting = `${streak.current_streak}일째 함께하고 있어요! 꾸준함이 힘이에요`
    } else if (yesterdayItems && yesterdayItems.length >= 5) {
      greeting = "어제 정말 활발했어요! 오늘도 화이팅"
    } else if (todayItems && todayItems.length === 0) {
      greeting = "오늘의 첫 기록을 남겨볼까요?"
    } else if (todayItems && todayItems.length > 0) {
      greeting = `오늘 벌써 ${todayItems.length}개 기록했어요!`
    } else {
      greeting = "무엇이든 기록해보세요"
    }

    // Build briefing message
    const yesterdayTotal = yesterdayItems?.length || 0
    const todayTotal = todayItems?.length || 0
    const pendingCount = pendingTodos?.length || 0
    const overdueCount = overdueTodos?.length || 0
    const weekTotal = weekItems?.length || 0

    return NextResponse.json({
      greeting,
      yesterday: {
        total: yesterdayTotal,
        counts: yesterdayCounts,
        snippets: yesterdaySnippets,
      },
      today: {
        total: todayTotal,
      },
      todos: {
        pending: pendingCount,
        overdue: overdueCount,
        items: (pendingTodos || []).slice(0, 3).map((t) => t.content),
      },
      week: {
        total: weekTotal,
        counts: weekCounts,
      },
      totalItems: totalItems || 0,
      streak: {
        current: streak.current_streak,
        longest: streak.longest_streak,
      },
      zombie,
      rediscoveries,
      unreadLinks,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Briefing error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
