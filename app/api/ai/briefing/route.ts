import { getUser } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

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

    // Generate greeting based on time
    const hour = now.getHours()
    let greeting: string
    if (hour < 12) greeting = "좋은 아침이에요"
    else if (hour < 18) greeting = "좋은 오후에요"
    else greeting = "좋은 저녁이에요"

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
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Briefing error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
