import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { PLAN_LIMITS } from "@/lib/plans"
import {
  gatherStats,
  gatherHourlyHeatmap,
  gatherStreakSnapshot,
  gatherReminders,
  generateInterests,
  generateMonthlyDigest,
  generateProductivityScore,
  fetchSummaries,
} from "@/lib/insights/gather"
import type {
  InsightReportData,
  MoMComparisonData,
  WeeklyBreakdownData,
} from "@/lib/supabase/types"

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = getServiceSupabase()

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    const monthStr = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}-01`
    const startDate = monthStart.toISOString()
    const endDate = monthEnd.toISOString()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate()

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
        const { stats, items } = await gatherStats(supabase, userId, startDate, endDate)

        // ─── 2. Hourly Heatmap ──────────────────────────────────────
        const hourlyHeatmap = gatherHourlyHeatmap(items)

        // ─── 3. Streak Snapshot ─────────────────────────────────────
        const streak = await gatherStreakSnapshot(
          supabase,
          userId,
          stats.daily_heatmap,
          daysInMonth
        )

        // ─── 4. Interests (Pro only) ────────────────────────────────
        let interests = {
          top_topics: [] as string[],
          trending_up: [] as string[],
          trending_down: [] as string[],
          summary: "",
        }

        // Fetch previous month's topics for comparison
        let prevTopics: string[] | undefined
        if (isPro && PLAN_LIMITS.pro.insight_ai_analysis) {
          const prevMonthDate = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1)
          const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}-01`

          const { data: prevReport } = await supabase
            .from("insight_reports")
            .select("report_data")
            .eq("user_id", userId)
            .eq("month", prevMonthStr)
            .eq("report_type", "monthly")
            .single()

          if (prevReport?.report_data?.interests?.top_topics) {
            prevTopics = prevReport.report_data.interests.top_topics
          }

          const summaries = await fetchSummaries(supabase, userId, startDate, endDate)
          if (summaries) {
            interests = await generateInterests(summaries, prevTopics)
          }
        }

        // ─── 5. MoM Comparison (Pro only) ───────────────────────────
        let momComparison: MoMComparisonData | undefined
        if (isPro && PLAN_LIMITS.pro.insight_ai_analysis) {
          const prevMonthDate = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1)
          const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}-01`

          const { data: prevReport } = await supabase
            .from("insight_reports")
            .select("report_data")
            .eq("user_id", userId)
            .eq("month", prevMonthStr)
            .eq("report_type", "monthly")
            .single()

          if (prevReport?.report_data?.stats) {
            const prevTotal = prevReport.report_data.stats.total_captures || 0
            const currentTotal = stats.total_captures
            const changePercent = prevTotal > 0
              ? Math.round(((currentTotal - prevTotal) / prevTotal) * 100)
              : 0

            const prevTopicsList: string[] = prevReport.report_data.interests?.top_topics || []
            const currentTopicsList: string[] = interests.top_topics || []

            momComparison = {
              previous_total: prevTotal,
              current_total: currentTotal,
              change_percent: changePercent,
              new_topics: currentTopicsList.filter((t) => !prevTopicsList.includes(t)),
              dropped_topics: prevTopicsList.filter((t) => !currentTopicsList.includes(t)),
            }
          }
        }

        // ─── 6. Weekly Breakdown ────────────────────────────────────
        const weeklyBreakdown: WeeklyBreakdownData[] = []
        {
          // Split items into weeks (Mon-Sun)
          const weekMap = new Map<string, Array<{ created_at: string; type?: string; project_id?: string }>>()

          // Fetch items with type and project for breakdown
          const { data: breakdownItems } = await supabase
            .from("items")
            .select("created_at, type, project_id")
            .eq("user_id", userId)
            .gte("created_at", startDate)
            .lte("created_at", endDate)

          for (const item of breakdownItems || []) {
            const d = new Date(item.created_at)
            // Find Monday of this item's week
            const dayOfWeek = d.getUTCDay()
            const monday = new Date(d)
            monday.setUTCDate(d.getUTCDate() - ((dayOfWeek + 6) % 7))
            const key = monday.toISOString().slice(0, 10)
            if (!weekMap.has(key)) weekMap.set(key, [])
            weekMap.get(key)!.push(item)
          }

          const sortedWeeks = Array.from(weekMap.entries()).sort(([a], [b]) => a.localeCompare(b))

          for (const [weekStartStr, weekItems] of sortedWeeks) {
            const ws = new Date(weekStartStr)
            const we = new Date(ws)
            we.setUTCDate(ws.getUTCDate() + 6)

            const byType: Record<string, number> = {}
            const projectCounts: Record<string, number> = {}

            for (const item of weekItems) {
              if (item.type) byType[item.type] = (byType[item.type] || 0) + 1
              if (item.project_id) projectCounts[item.project_id] = (projectCounts[item.project_id] || 0) + 1
            }

            const topProjIds = Object.entries(projectCounts)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 3)
              .map(([id]) => id)

            let topProjects: string[] = []
            if (topProjIds.length > 0) {
              const { data: projNames } = await supabase
                .from("projects")
                .select("id, name")
                .in("id", topProjIds)

              topProjects = topProjIds.map((id) => {
                const p = projNames?.find((pn) => pn.id === id)
                return p?.name || "Unknown"
              })
            }

            weeklyBreakdown.push({
              week_start: weekStartStr,
              week_end: we.toISOString().slice(0, 10),
              total_captures: weekItems.length,
              by_type: byType,
              top_projects: topProjects,
            })
          }
        }

        // ─── 7. Reminders ───────────────────────────────────────────
        const reminders = await gatherReminders(supabase, userId, now)

        // ─── 8. Productivity Score (Pro only) ───────────────────────
        let productivityScore: InsightReportData["productivity_score"]
        if (isPro && PLAN_LIMITS.pro.insight_ai_analysis) {
          productivityScore = await generateProductivityScore(
            {
              total_captures: stats.total_captures,
              activeDays: streak.total_active_days,
              todoCompleted: stats.todos.completed,
              todoPending: stats.todos.pending,
            },
            streak
          )
        }

        // ─── 9. Digest (Pro only) ──────────────────────────────────
        let digest = {
          one_liner: "",
          key_insights: [] as string[],
          full_summary: "",
        }

        if (isPro && PLAN_LIMITS.pro.insight_ai_analysis) {
          const summaries = await fetchSummaries(supabase, userId, startDate, endDate)
          if (summaries) {
            const monthLabel = `${monthStart.getFullYear()}년 ${monthStart.getMonth() + 1}월`
            digest = await generateMonthlyDigest(summaries, {
              period: monthLabel,
              totalCaptures: stats.total_captures,
              activeDays: streak.total_active_days,
              totalDays: daysInMonth,
              peakHour: hourlyHeatmap.peak_hour,
              currentStreak: streak.current_streak,
              momChangePercent: momComparison?.change_percent,
            })
          }
        }

        // ─── Upsert report ──────────────────────────────────────────
        const reportData: InsightReportData = {
          stats,
          interests,
          reminders,
          digest,
          hourly_heatmap: hourlyHeatmap,
          mom_comparison: momComparison,
          streak,
          productivity_score: productivityScore,
          weekly_breakdown: weeklyBreakdown,
        }

        await supabase.from("insight_reports").upsert(
          {
            user_id: userId,
            month: monthStr,
            report_type: "monthly",
            report_data: reportData,
          },
          { onConflict: "user_id,month,report_type" }
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
