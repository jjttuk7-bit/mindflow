import { SupabaseClient } from "@supabase/supabase-js"
import { getOpenAI, MODEL_MAP } from "@/lib/ai"
import type {
  HourlyHeatmapData,
  StreakSnapshotData,
  ProductivityScoreData,
} from "@/lib/supabase/types"

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

// ─── Stats ─────────────────────────────────────────────────────────

export async function gatherStats(
  supabase: SupabaseClient,
  userId: string,
  startDate: string,
  endDate: string
) {
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

  // Daily heatmap + items with created_at for hourly analysis
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

  return {
    stats: {
      total_captures: totalCaptures || 0,
      by_type: byType,
      by_source: bySource,
      daily_heatmap: dailyHeatmap,
      top_projects: topProjects,
      todos: {
        completed: completedTodos || 0,
        pending: pendingTodos || 0,
      },
    },
    items: itemsByDay || [],
  }
}

// ─── Hourly Heatmap ────────────────────────────────────────────────

export function gatherHourlyHeatmap(
  items: Array<{ created_at: string }>
): HourlyHeatmapData {
  const hourlyCounts: Record<string, number> = {}
  for (let h = 0; h < 24; h++) {
    hourlyCounts[String(h)] = 0
  }

  for (const item of items) {
    const hour = new Date(item.created_at).getUTCHours()
    hourlyCounts[String(hour)] = (hourlyCounts[String(hour)] || 0) + 1
  }

  let peakHour = 0
  let peakCount = 0
  for (const [h, count] of Object.entries(hourlyCounts)) {
    if (count > peakCount) {
      peakHour = parseInt(h)
      peakCount = count
    }
  }

  return { hourly_counts: hourlyCounts, peak_hour: peakHour, peak_count: peakCount }
}

// ─── Streak Snapshot ───────────────────────────────────────────────

export async function gatherStreakSnapshot(
  supabase: SupabaseClient,
  userId: string,
  dailyHeatmap: Record<string, number>,
  totalDays: number
): Promise<StreakSnapshotData> {
  const { data: streakRow } = await supabase
    .from("user_streaks")
    .select("current_streak, longest_streak")
    .eq("user_id", userId)
    .single()

  const activeDays = Object.values(dailyHeatmap).filter((c) => c > 0).length
  const activeRate = totalDays > 0 ? Math.round((activeDays / totalDays) * 100) : 0

  return {
    current_streak: streakRow?.current_streak ?? 0,
    longest_streak: streakRow?.longest_streak ?? 0,
    total_active_days: activeDays,
    active_rate_percent: activeRate,
  }
}

// ─── Reminders ─────────────────────────────────────────────────────

export async function gatherReminders(
  supabase: SupabaseClient,
  userId: string,
  now: Date
) {
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: unreadLinks } = await supabase
    .from("items")
    .select("id, summary, content, created_at")
    .eq("user_id", userId)
    .eq("type", "link")
    .eq("is_archived", false)
    .lte("created_at", sevenDaysAgo)
    .limit(10)

  const { data: overdueTodos } = await supabase
    .from("todos")
    .select("id, content, due_date")
    .eq("user_id", userId)
    .eq("is_completed", false)
    .not("due_date", "is", null)
    .lte("due_date", now.toISOString())
    .limit(10)

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

  return {
    unread_links: unreadLinks?.length || 0,
    overdue_todos: overdueTodos?.length || 0,
    stale_pins: stalePins?.length || 0,
    items: reminderItems,
  }
}

// ─── AI: Weekly Digest ─────────────────────────────────────────────

export async function generateWeeklyDigest(
  summaries: string,
  ctx: { period: string; totalCaptures: number; activeDays: number; peakHour: number }
) {
  const result = await getOpenAI().chat.completions.create({
    model: MODEL_MAP.analysis,
    messages: [
      {
        role: "user",
        content: `Create a weekly digest of these personal knowledge captures.
Period: ${ctx.period}
Total captures: ${ctx.totalCaptures}, Active days: ${ctx.activeDays}/7, Peak hour: ${ctx.peakHour}:00

Return ONLY valid JSON:
{
  "one_liner": "A single catchy sentence summarizing the week",
  "key_insights": ["insight 1", "insight 2", "insight 3"],
  "full_summary": "A comprehensive paragraph summarizing the week's captures, patterns, and highlights. Include one actionable suggestion for next week."
}

Write in the same language as the content.

Items:
${summaries}`,
      },
    ],
  })

  return safeJsonParse(result.choices[0].message.content?.trim() || "", {
    one_liner: "",
    key_insights: [] as string[],
    full_summary: "",
  })
}

// ─── AI: Productivity Score ────────────────────────────────────────

export async function generateProductivityScore(
  stats: { total_captures: number; activeDays: number; todoCompleted: number; todoPending: number },
  streak: StreakSnapshotData
): Promise<ProductivityScoreData> {
  const result = await getOpenAI().chat.completions.create({
    model: MODEL_MAP.analysis,
    messages: [
      {
        role: "user",
        content: `Evaluate productivity based on these metrics and return a score from 0-100.

Captures: ${stats.total_captures}
Active days: ${stats.activeDays}
TODOs completed: ${stats.todoCompleted}, pending: ${stats.todoPending}
Current streak: ${streak.current_streak} days
Activity rate: ${streak.active_rate_percent}%

Return ONLY valid JSON:
{
  "score": 75,
  "label": "Good",
  "factors": ["Consistent daily activity", "High capture rate", "Room for TODO completion improvement"]
}

Labels: "Excellent" (80+), "Good" (60-79), "Building Up" (40-59), "Getting Started" (<40).
Write factors in the same language as would match the user's content language (Korean if unsure).`,
      },
    ],
  })

  return safeJsonParse(result.choices[0].message.content?.trim() || "", {
    score: 50,
    label: "Building Up",
    factors: [],
  })
}

// ─── AI: Interests ─────────────────────────────────────────────────

export async function generateInterests(
  summaries: string,
  prevTopics?: string[]
) {
  const prevContext = prevTopics && prevTopics.length > 0
    ? `\nPrevious month's top topics: ${prevTopics.join(", ")}\nCompare with current topics and note what's new vs dropped.`
    : ""

  const result = await getOpenAI().chat.completions.create({
    model: MODEL_MAP.analysis,
    messages: [
      {
        role: "user",
        content: `Analyze these personal knowledge captures and identify topic patterns.${prevContext}
Return ONLY valid JSON:
{
  "top_topics": ["topic1", "topic2", ...],
  "trending_up": ["growing interest 1", ...],
  "trending_down": ["declining interest 1", ...],
  "summary": "One paragraph analysis with actionable recommendations for deepening key interests"
}

Write in the same language as the content.

Items:
${summaries}`,
      },
    ],
  })

  return safeJsonParse(result.choices[0].message.content?.trim() || "", {
    top_topics: [] as string[],
    trending_up: [] as string[],
    trending_down: [] as string[],
    summary: "",
  })
}

// ─── AI: Monthly Digest ────────────────────────────────────────────

export async function generateMonthlyDigest(
  summaries: string,
  ctx: {
    period: string
    totalCaptures: number
    activeDays: number
    totalDays: number
    peakHour: number
    currentStreak: number
    momChangePercent?: number
  }
) {
  const momNote = ctx.momChangePercent !== undefined
    ? `, MoM change: ${ctx.momChangePercent > 0 ? "+" : ""}${ctx.momChangePercent}%`
    : ""

  const result = await getOpenAI().chat.completions.create({
    model: MODEL_MAP.analysis,
    messages: [
      {
        role: "user",
        content: `Create a monthly digest summary of these personal knowledge captures.
Period: ${ctx.period}
Total captures: ${ctx.totalCaptures}, Active days: ${ctx.activeDays}/${ctx.totalDays}, Peak hour: ${ctx.peakHour}:00, Streak: ${ctx.currentStreak} days${momNote}

Return ONLY valid JSON:
{
  "one_liner": "A single catchy sentence summarizing the month",
  "key_insights": ["insight 1", "insight 2", "insight 3"],
  "full_summary": "A comprehensive paragraph with specific, actionable recommendations based on patterns observed"
}

Write in the same language as the content.

Items:
${summaries}`,
      },
    ],
  })

  return safeJsonParse(result.choices[0].message.content?.trim() || "", {
    one_liner: "",
    key_insights: [] as string[],
    full_summary: "",
  })
}

// ─── Utilization ──────────────────────────────────────────────────

export async function gatherUtilization(
  supabase: SupabaseClient,
  userId: string,
  startDate: string,
  endDate: string
) {
  // Total items created in the period
  const { count: totalItems } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startDate)
    .lte("created_at", endDate)

  // Archived items (read and organized)
  const { count: archived } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_archived", true)
    .gte("created_at", startDate)
    .lte("created_at", endDate)

  // Items that have connections
  const { data: connectedItems } = await supabase
    .from("item_connections")
    .select("source_id")
    .gte("created_at", startDate)
    .lte("created_at", endDate)

  // Filter connections belonging to this user's items
  const connectedIds = new Set(
    (connectedItems || []).map((c) => c.source_id)
  )
  // Count unique connected items — approximate by counting source_ids
  const connected = connectedIds.size

  // Completed todos in the period
  const { count: todosCompleted } = await supabase
    .from("todos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_completed", true)
    .gte("updated_at", startDate)
    .lte("updated_at", endDate)

  const total = totalItems || 0
  const arch = archived || 0
  const comp = todosCompleted || 0
  const rate = total > 0 ? Math.round(((arch + connected + comp) / total) * 100) : 0

  return {
    total_items: total,
    archived: arch,
    connected,
    todos_completed: comp,
    rate: Math.min(rate, 100),
  }
}

// ─── Knowledge Health Score ───────────────────────────────────────

export async function gatherKnowledgeHealth(
  supabase: SupabaseClient,
  userId: string,
  startDate: string,
  endDate: string,
  utilizationRate: number
) {
  // 1. Capture consistency (25 points): days with at least 1 capture
  const { data: captureItems } = await supabase
    .from("items")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", startDate)
    .lte("created_at", endDate)

  const captureDays = new Set(
    (captureItems || []).map((i) => i.created_at.slice(0, 10))
  )
  // 5+ days out of 7 = max score
  const captureConsistency = Math.min(Math.round((captureDays.size / 5) * 25), 25)

  // 2. Organization (25 points): zombie ratio — lower is better
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const { count: totalAll } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("deleted_at", null)

  const { count: zombieLinks } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", "link")
    .eq("is_archived", false)
    .is("deleted_at", null)
    .lte("created_at", thirtyDaysAgo.toISOString())
    .lte("updated_at", sevenDaysAgo.toISOString())

  const { count: zombieTodos } = await supabase
    .from("todos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_completed", false)
    .lte("created_at", fourteenDaysAgo.toISOString())

  const { count: zombiePins } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_pinned", true)
    .is("deleted_at", null)
    .lte("created_at", thirtyDaysAgo.toISOString())

  const totalCount = totalAll || 1
  const zombieCount = (zombieLinks || 0) + (zombieTodos || 0) + (zombiePins || 0)
  const zombieRatio = zombieCount / totalCount
  const organization = Math.round((1 - Math.min(zombieRatio, 1)) * 25)

  // 3. Utilization (20 points)
  const utilization = Math.round((utilizationRate / 100) * 20)

  // 4. Diversity (15 points): from AI profile diversity_score
  const { data: settings } = await supabase
    .from("user_settings")
    .select("ai_profile")
    .eq("user_id", userId)
    .single()

  const diversityScore = (settings?.ai_profile as Record<string, unknown>)?.diversity_score as
    | { score: number }
    | undefined
  const diversity = diversityScore
    ? Math.round((Math.min(diversityScore.score, 100) / 100) * 15)
    : 8 // default mid-range

  // 5. Connectivity (15 points): ratio of items with connections
  const { count: connectedCount } = await supabase
    .from("item_connections")
    .select("source_id", { count: "exact", head: true })
    .gte("created_at", startDate)
    .lte("created_at", endDate)

  const connectionRatio = (captureItems?.length || 1) > 0
    ? (connectedCount || 0) / (captureItems?.length || 1)
    : 0
  const connectivity = Math.round(Math.min(connectionRatio, 1) * 15)

  const score = captureConsistency + organization + utilization + diversity + connectivity

  let grade: string
  if (score >= 90) grade = "훌륭해요!"
  else if (score >= 70) grade = "잘하고 있어요"
  else if (score >= 50) grade = "조금 더 신경 써볼까요?"
  else grade = "함께 정리해볼까요?"

  // Generate tips based on lowest factors
  const tips: string[] = []
  const factors = [
    { name: "캡처 꾸준함", score: captureConsistency, max: 25 },
    { name: "정리 상태", score: organization, max: 25 },
    { name: "활용률", score: utilization, max: 20 },
    { name: "다양성", score: diversity, max: 15 },
    { name: "연결성", score: connectivity, max: 15 },
  ]
  const sorted = [...factors].sort((a, b) => (a.score / a.max) - (b.score / b.max))

  for (const f of sorted.slice(0, 2)) {
    const ratio = f.score / f.max
    if (ratio < 0.5) {
      if (f.name === "캡처 꾸준함") tips.push("매일 조금씩이라도 기록하는 습관을 만들어보세요")
      else if (f.name === "정리 상태") tips.push("오래된 항목을 아카이브하거나 삭제해서 정리해보세요")
      else if (f.name === "활용률") tips.push("저장한 내용을 다시 읽고 아카이브로 정리해보세요")
      else if (f.name === "다양성") tips.push("다양한 주제의 콘텐츠를 탐색해보세요")
      else if (f.name === "연결성") tips.push("관련 있는 항목들을 연결해서 지식 네트워크를 만들어보세요")
    }
  }

  return {
    score,
    grade,
    factors: {
      capture_consistency: captureConsistency,
      organization,
      utilization,
      diversity,
      connectivity,
    },
    tips,
  }
}

// ─── Connection Summary ──────────────────────────────────────────

export async function gatherConnectionSummary(
  supabase: SupabaseClient,
  userId: string,
  startDate: string,
  endDate: string
) {
  // Get connections created this period
  const { data: connections } = await supabase
    .from("item_connections")
    .select("source_id, target_id, ai_reason")
    .gte("created_at", startDate)
    .lte("created_at", endDate)

  if (!connections || connections.length === 0) {
    return { new_connections: 0, top_pairs: [] }
  }

  // Get item summaries for the connected items
  const allIds = [
    ...new Set([
      ...connections.map((c) => c.source_id),
      ...connections.map((c) => c.target_id),
    ]),
  ]

  const { data: items } = await supabase
    .from("items")
    .select("id, summary, content, user_id")
    .in("id", allIds.slice(0, 50))
    .eq("user_id", userId)

  const itemMap = new Map(
    (items || []).map((i) => [i.id, i.summary || i.content?.slice(0, 50) || ""])
  )

  // Filter connections that belong to this user's items
  const userConnections = connections.filter(
    (c) => itemMap.has(c.source_id) || itemMap.has(c.target_id)
  )

  const topPairs = userConnections.slice(0, 3).map((c) => ({
    source: itemMap.get(c.source_id) || "",
    target: itemMap.get(c.target_id) || "",
    reason: c.ai_reason || undefined,
  }))

  return {
    new_connections: userConnections.length,
    top_pairs: topPairs,
  }
}

// ─── Interest Shift Detection ────────────────────────────────────

export async function gatherInterestShift(
  supabase: SupabaseClient,
  userId: string,
  startDate: string,
  endDate: string
) {
  // Current period tags
  const { data: currentItems } = await supabase
    .from("items")
    .select("id, item_tags(tags(name))")
    .eq("user_id", userId)
    .gte("created_at", startDate)
    .lte("created_at", endDate)

  const currentTagCount: Record<string, number> = {}
  for (const item of currentItems || []) {
    const tags = (item.item_tags as unknown as { tags: { name: string } }[]) || []
    for (const t of tags) {
      if (t.tags?.name) currentTagCount[t.tags.name] = (currentTagCount[t.tags.name] || 0) + 1
    }
  }

  // Previous period (same duration, shifted back)
  const start = new Date(startDate)
  const end = new Date(endDate)
  const duration = end.getTime() - start.getTime()
  const prevStart = new Date(start.getTime() - duration).toISOString()
  const prevEnd = new Date(start.getTime() - 1).toISOString()

  const { data: prevItems } = await supabase
    .from("items")
    .select("id, item_tags(tags(name))")
    .eq("user_id", userId)
    .gte("created_at", prevStart)
    .lte("created_at", prevEnd)

  const prevTagCount: Record<string, number> = {}
  for (const item of prevItems || []) {
    const tags = (item.item_tags as unknown as { tags: { name: string } }[]) || []
    for (const t of tags) {
      if (t.tags?.name) prevTagCount[t.tags.name] = (prevTagCount[t.tags.name] || 0) + 1
    }
  }

  const currentTags = Object.entries(currentTagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }))

  const previousTags = Object.entries(prevTagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }))

  const prevTagNames = new Set(Object.keys(prevTagCount))
  const currTagNames = new Set(Object.keys(currentTagCount))

  // New interests: in current top but not in previous
  const newInterests = currentTags
    .filter((t) => !prevTagNames.has(t.name))
    .map((t) => t.name)
    .slice(0, 5)

  // Fading interests: in previous top but not in current
  const fadingInterests = previousTags
    .filter((t) => !currTagNames.has(t.name))
    .map((t) => t.name)
    .slice(0, 5)

  return {
    current_tags: currentTags,
    previous_tags: previousTags,
    new_interests: newInterests,
    fading_interests: fadingInterests,
  }
}

// ─── Summaries text builder ────────────────────────────────────────

export async function fetchSummaries(
  supabase: SupabaseClient,
  userId: string,
  startDate: string,
  endDate: string,
  limit = 100
): Promise<string> {
  const { data: items } = await supabase
    .from("items")
    .select("summary, content, type")
    .eq("user_id", userId)
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .limit(limit)

  if (!items || items.length === 0) return ""

  return items
    .map((i) => `[${i.type}] ${i.summary || i.content?.slice(0, 100)}`)
    .join("\n")
}
