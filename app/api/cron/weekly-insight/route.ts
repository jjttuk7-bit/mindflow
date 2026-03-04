import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { PLAN_LIMITS } from "@/lib/plans"
import {
  gatherStats,
  gatherHourlyHeatmap,
  gatherStreakSnapshot,
  gatherReminders,
  generateWeeklyDigest,
  generateProductivityScore,
  fetchSummaries,
} from "@/lib/insights/gather"
import type { WeeklyInsightData } from "@/lib/supabase/types"

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = getServiceSupabase()

    // Calculate last week's Monday–Sunday range
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    // today is Monday (cron runs on Monday); last week = 7 days back to yesterday
    const weekEnd = new Date(today.getTime() - 1) // Sunday 23:59:59.999
    weekEnd.setHours(23, 59, 59, 999)
    const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) // Last Monday 00:00

    const startDate = weekStart.toISOString()
    const endDate = weekEnd.toISOString()
    // Store as the Monday date for this weekly report
    const monthStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`

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
        // 1. Stats
        const { stats, items } = await gatherStats(supabase, userId, startDate, endDate)

        // 2. Hourly heatmap
        const hourlyHeatmap = gatherHourlyHeatmap(items)

        // 3. Streak
        const streak = await gatherStreakSnapshot(
          supabase,
          userId,
          stats.daily_heatmap,
          7
        )

        // 4. Reminders
        const reminders = await gatherReminders(supabase, userId, now)

        // 5. Weekly Digest (Pro only)
        let digest: WeeklyInsightData["digest"] = undefined
        if (isPro && PLAN_LIMITS.pro.insight_ai_analysis) {
          const summaries = await fetchSummaries(supabase, userId, startDate, endDate)
          if (summaries) {
            const weekLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`
            digest = await generateWeeklyDigest(summaries, {
              period: weekLabel,
              totalCaptures: stats.total_captures,
              activeDays: streak.total_active_days,
              peakHour: hourlyHeatmap.peak_hour,
            })
          }
        }

        // 6. Productivity Score (Pro only)
        let productivityScore: WeeklyInsightData["productivity_score"] = undefined
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

        const reportData: WeeklyInsightData = {
          stats,
          hourly_heatmap: hourlyHeatmap,
          streak,
          productivity_score: productivityScore,
          reminders,
          digest,
        }

        await supabase.from("insight_reports").upsert(
          {
            user_id: userId,
            month: monthStr,
            report_type: "weekly",
            report_data: reportData,
          },
          { onConflict: "user_id,month,report_type" }
        )

        processed++
      } catch (err) {
        console.error(`Weekly insight error for user ${userId}:`, err)
      }
    }

    return NextResponse.json({ ok: true, processed })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Weekly insight cron error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
