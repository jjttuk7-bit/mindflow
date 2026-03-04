import { createClient } from "@supabase/supabase-js"
import { getOpenAI, MODEL_MAP } from "@/lib/ai"
import { NextRequest, NextResponse } from "next/server"
import { PLAN_LIMITS } from "@/lib/plans"

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/[\[{][\s\S]*[\]}]/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {
        /* ignore */
      }
    }
    return fallback
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify CRON_SECRET
    const authHeader = req.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = getServiceSupabase()

    // Calculate last month's date range
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    const monthStr = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}-01`
    const startDate = monthStart.toISOString()
    const endDate = monthEnd.toISOString()

    // Get all users from user_settings
    const { data: users, error: usersError } = await supabase
      .from("user_settings")
      .select("user_id, plan")

    if (usersError || !users) {
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
    }

    let processed = 0

    for (const userRow of users) {
      const userId = userRow.user_id
      const plan = (userRow.plan || "free") as keyof typeof PLAN_LIMITS
      const isPro = plan === "pro"

      try {
        // ─── 1. Stats ───────────────────────────────────────────────
        // Total captures
        const { count: totalCaptures } = await supabase
          .from("items")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("created_at", startDate)
          .lte("created_at", endDate)

        // By type
        const { data: itemsByType } = await supabase
          .from("items")
          .select("type")
          .eq("user_id", userId)
          .gte("created_at", startDate)
          .lte("created_at", endDate)

        const byType: Record<string, number> = {}
        for (const item of itemsByType || []) {
          byType[item.type] = (byType[item.type] || 0) + 1
        }

        // By source
        const { data: itemsBySource } = await supabase
          .from("items")
          .select("source")
          .eq("user_id", userId)
          .gte("created_at", startDate)
          .lte("created_at", endDate)

        const bySource: Record<string, number> = {}
        for (const item of itemsBySource || []) {
          const src = (item.source as string) || "web"
          bySource[src] = (bySource[src] || 0) + 1
        }

        // Daily heatmap
        const { data: itemsByDay } = await supabase
          .from("items")
          .select("created_at")
          .eq("user_id", userId)
          .gte("created_at", startDate)
          .lte("created_at", endDate)

        const dailyHeatmap: Record<string, number> = {}
        for (const item of itemsByDay || []) {
          const day = item.created_at.slice(0, 10)
          dailyHeatmap[day] = (dailyHeatmap[day] || 0) + 1
        }

        // Top 3 projects
        const { data: projectItems } = await supabase
          .from("items")
          .select("project_id")
          .eq("user_id", userId)
          .gte("created_at", startDate)
          .lte("created_at", endDate)
          .not("project_id", "is", null)

        const projectCounts: Record<string, number> = {}
        for (const item of projectItems || []) {
          if (item.project_id) {
            projectCounts[item.project_id] = (projectCounts[item.project_id] || 0) + 1
          }
        }

        const topProjectIds = Object.entries(projectCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([id]) => id)

        let topProjects: string[] = []
        if (topProjectIds.length > 0) {
          const { data: projectNames } = await supabase
            .from("projects")
            .select("id, name")
            .in("id", topProjectIds)

          topProjects = topProjectIds.map((id) => {
            const p = projectNames?.find((pn) => pn.id === id)
            return p?.name || "Unknown"
          })
        }

        // TODO stats
        const { count: completedTodos } = await supabase
          .from("todos")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("is_completed", true)
          .gte("updated_at", startDate)
          .lte("updated_at", endDate)

        const { count: pendingTodos } = await supabase
          .from("todos")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("is_completed", false)

        const stats = {
          total_captures: totalCaptures || 0,
          by_type: byType,
          by_source: bySource,
          daily_heatmap: dailyHeatmap,
          top_projects: topProjects,
          todos: {
            completed: completedTodos || 0,
            pending: pendingTodos || 0,
          },
        }

        // ─── 2. Interests (Pro only) ────────────────────────────────
        let interests = {
          top_topics: [] as string[],
          trending_up: [] as string[],
          trending_down: [] as string[],
          summary: "",
        }

        if (isPro && PLAN_LIMITS.pro.insight_ai_analysis) {
          const { data: monthItems } = await supabase
            .from("items")
            .select("summary, content, type")
            .eq("user_id", userId)
            .gte("created_at", startDate)
            .lte("created_at", endDate)
            .limit(100)

          if (monthItems && monthItems.length > 0) {
            const summaries = monthItems
              .map((i) => `[${i.type}] ${i.summary || i.content?.slice(0, 100)}`)
              .join("\n")

            const interestResult = await getOpenAI().chat.completions.create({
              model: MODEL_MAP.analysis,
              messages: [{
                role: "user",
                content: `Analyze these personal knowledge captures and identify topic patterns.
Return ONLY valid JSON with this structure:
{
  "top_topics": ["topic1", "topic2", ...],
  "trending_up": ["growing interest 1", ...],
  "trending_down": ["declining interest 1", ...],
  "summary": "One paragraph analysis of the user's interests and patterns"
}

Write in the same language as the content.

Items:
${summaries}`,
              }],
            })

            interests = safeJsonParse(interestResult.choices[0].message.content?.trim() || "", interests)
          }
        }

        // ─── 3. Reminders ───────────────────────────────────────────
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

        // Unread links (>7 days old, not archived)
        const { data: unreadLinks } = await supabase
          .from("items")
          .select("id, summary, content, created_at")
          .eq("user_id", userId)
          .eq("type", "link")
          .eq("is_archived", false)
          .lte("created_at", sevenDaysAgo)
          .limit(10)

        // Overdue todos
        const { data: overdueTodos } = await supabase
          .from("todos")
          .select("id, content, due_date")
          .eq("user_id", userId)
          .eq("is_completed", false)
          .not("due_date", "is", null)
          .lte("due_date", now.toISOString())
          .limit(10)

        // Stale pins (pinned items >30 days old)
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
        const { data: stalePins } = await supabase
          .from("items")
          .select("id, summary, content, created_at")
          .eq("user_id", userId)
          .eq("is_pinned", true)
          .lte("created_at", thirtyDaysAgo)
          .limit(10)

        const reminderItems: Array<{ id: string; title: string; age_days: number }> = []

        for (const link of unreadLinks || []) {
          const ageDays = Math.floor(
            (now.getTime() - new Date(link.created_at).getTime()) / (1000 * 60 * 60 * 24)
          )
          reminderItems.push({
            id: link.id,
            title: link.summary || link.content?.slice(0, 60) || "Untitled link",
            age_days: ageDays,
          })
        }

        for (const todo of overdueTodos || []) {
          const ageDays = Math.floor(
            (now.getTime() - new Date(todo.due_date!).getTime()) / (1000 * 60 * 60 * 24)
          )
          reminderItems.push({
            id: todo.id,
            title: todo.content?.slice(0, 60) || "Untitled todo",
            age_days: ageDays,
          })
        }

        for (const pin of stalePins || []) {
          const ageDays = Math.floor(
            (now.getTime() - new Date(pin.created_at).getTime()) / (1000 * 60 * 60 * 24)
          )
          reminderItems.push({
            id: pin.id,
            title: pin.summary || pin.content?.slice(0, 60) || "Untitled pin",
            age_days: ageDays,
          })
        }

        const reminders = {
          unread_links: unreadLinks?.length || 0,
          overdue_todos: overdueTodos?.length || 0,
          stale_pins: stalePins?.length || 0,
          items: reminderItems,
        }

        // ─── 4. Digest (Pro only) ───────────────────────────────────
        let digest = {
          one_liner: "",
          key_insights: [] as string[],
          full_summary: "",
        }

        if (isPro && PLAN_LIMITS.pro.insight_ai_analysis) {
          const { data: digestItems } = await supabase
            .from("items")
            .select("summary, content, type")
            .eq("user_id", userId)
            .gte("created_at", startDate)
            .lte("created_at", endDate)
            .limit(100)

          if (digestItems && digestItems.length > 0) {
            const summaries = digestItems
              .map((i) => `[${i.type}] ${i.summary || i.content?.slice(0, 100)}`)
              .join("\n")

            const digestResult = await getOpenAI().chat.completions.create({
              model: MODEL_MAP.analysis,
              messages: [{
                role: "user",
                content: `Create a monthly digest summary of these personal knowledge captures.
Return ONLY valid JSON with this structure:
{
  "one_liner": "A single catchy sentence summarizing the month",
  "key_insights": ["insight 1", "insight 2", "insight 3"],
  "full_summary": "A comprehensive paragraph summarizing the month's captures, patterns, and highlights"
}

Write in the same language as the content.

Items:
${summaries}`,
              }],
            })

            digest = safeJsonParse(digestResult.choices[0].message.content?.trim() || "", digest)
          }
        }

        // ─── Upsert report ──────────────────────────────────────────
        const reportData = { stats, interests, reminders, digest }

        await supabase.from("insight_reports").upsert(
          {
            user_id: userId,
            month: monthStr,
            report_data: reportData,
          },
          { onConflict: "user_id,month" }
        )

        processed++
      } catch (err) {
        console.error(`Error processing user ${userId}:`, err)
      }
    }

    return NextResponse.json({ ok: true, processed })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Monthly insight cron error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
