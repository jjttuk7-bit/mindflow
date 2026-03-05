import { getUser } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { PLAN_LIMITS } from "@/lib/plans"
import {
  gatherStats,
  gatherHourlyHeatmap,
  gatherStreakSnapshot,
  gatherReminders,
  generateWeeklyDigest,
  generateMonthlyDigest,
  generateInterests,
  generateProductivityScore,
  fetchSummaries,
} from "@/lib/insights/gather"

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const type: "weekly" | "monthly" = body.type || "weekly"

    // Determine user plan
    const { data: settings } = await supabase
      .from("user_settings")
      .select("plan")
      .eq("user_id", user.id)
      .single()

    const plan = (settings?.plan || "free") as keyof typeof PLAN_LIMITS
    const isPro = plan === "pro"

    const now = new Date()
    let startDate: string
    let endDate: string
    let totalDays: number
    let periodLabel: string

    if (type === "weekly") {
      // Current week: last Monday to now
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const dayOfWeek = today.getDay()
      const mondayOffset = (dayOfWeek + 6) % 7
      const monday = new Date(today.getTime() - mondayOffset * 24 * 60 * 60 * 1000)
      startDate = monday.toISOString()
      endDate = now.toISOString()
      totalDays = 7
      periodLabel = `${monday.getMonth() + 1}/${monday.getDate()} - ${now.getMonth() + 1}/${now.getDate()}`
    } else {
      // Current month so far
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      startDate = monthStart.toISOString()
      endDate = now.toISOString()
      totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      periodLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월`
    }

    // Gather data using shared helpers
    const { stats, items } = await gatherStats(supabase, user.id, startDate, endDate)
    const hourlyHeatmap = gatherHourlyHeatmap(items)
    const streak = await gatherStreakSnapshot(supabase, user.id, stats.daily_heatmap, totalDays)
    const reminders = await gatherReminders(supabase, user.id, now)

    // Base report data
    const reportData: Record<string, unknown> = {
      stats,
      hourly_heatmap: hourlyHeatmap,
      streak,
      reminders,
    }

    // AI analysis sections
    {
      const summaries = await fetchSummaries(supabase, user.id, startDate, endDate)

      if (summaries) {
        if (type === "weekly") {
          reportData.digest = await generateWeeklyDigest(summaries, {
            period: periodLabel,
            totalCaptures: stats.total_captures,
            activeDays: streak.total_active_days,
            peakHour: hourlyHeatmap.peak_hour,
          })
        } else {
          reportData.interests = await generateInterests(summaries)
          reportData.digest = await generateMonthlyDigest(summaries, {
            period: periodLabel,
            totalCaptures: stats.total_captures,
            activeDays: streak.total_active_days,
            totalDays,
            peakHour: hourlyHeatmap.peak_hour,
            currentStreak: streak.current_streak,
          })
        }

        reportData.productivity_score = await generateProductivityScore(
          {
            total_captures: stats.total_captures,
            activeDays: streak.total_active_days,
            todoCompleted: stats.todos.completed,
            todoPending: stats.todos.pending,
          },
          streak
        )
      }
    }

    return NextResponse.json({
      report_type: type,
      report_data: reportData,
      is_preview: true,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Insight preview error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
