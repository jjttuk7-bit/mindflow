import { getUser } from "@/lib/supabase/server"
import { getUserPlan, PLAN_LIMITS } from "@/lib/plans"
import { NextResponse } from "next/server"

// GET: Retrieve profile
export async function GET() {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data } = await supabase
    .from("user_settings")
    .select("ai_profile")
    .eq("user_id", user.id)
    .single()

  return NextResponse.json(data?.ai_profile || {})
}

// POST: Trigger re-analysis
export async function POST() {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const plan = await getUserPlan(user.id)
  if (!PLAN_LIMITS[plan].ai_profile) {
    return NextResponse.json({ error: "Pro 플랜에서 사용할 수 있습니다", upgrade: true }, { status: 403 })
  }

  // Get items from last 90 days
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { data: items } = await supabase
    .from("items")
    .select("id, type, content, summary, context, created_at, item_tags(tags(name))")
    .eq("user_id", user.id)
    .gte("created_at", ninetyDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(200)

  if (!items || items.length < 5) {
    return NextResponse.json({ error: "데이터가 부족합니다 (최소 5개 항목)" }, { status: 400 })
  }

  // Pattern analysis: day-of-week, hour, type, tags
  const dayCount: Record<string, number> = {}
  const hourCount: Record<number, number> = {}
  const typeCount: Record<string, number> = {}
  const tagCount: Record<string, number> = {}

  for (const item of items) {
    const date = new Date(item.created_at)
    const day = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()]
    dayCount[day] = (dayCount[day] || 0) + 1
    hourCount[date.getHours()] = (hourCount[date.getHours()] || 0) + 1
    typeCount[item.type] = (typeCount[item.type] || 0) + 1

    const tags = (item.item_tags as unknown as { tags: { name: string } }[]) || []
    for (const t of tags) {
      if (t.tags?.name) tagCount[t.tags.name] = (tagCount[t.tags.name] || 0) + 1
    }
  }

  // Top interests
  const topTags = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ topic: name, count }))

  // Peak day/hour
  const peakDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "월"
  const peakHour = Object.entries(hourCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "9"

  // AI thinking style analysis via Gemini
  const { GoogleGenerativeAI } = await import("@google/generative-ai")
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

  const summaries = items
    .slice(0, 50)
    .map((i) => i.summary || i.content?.slice(0, 80))
    .join("\n")

  const analysisResult = await model.generateContent(
    `사용자가 최근 기록한 내용 요약 목록입니다. 이 사용자의 사고 성향과 관심 분야를 분석해주세요.

${summaries}

JSON만 반환:
{
  "thinking_style": "수렴형/발산형/분석형/실행형 중 하나",
  "style_description": "사고 성향 한 줄 설명 (한국어)",
  "interests_summary": "관심 분야 요약 2~3문장 (한국어)",
  "growth_tip": "지식 관리 팁 한 줄 (한국어)"
}`
  )

  let analysis = { thinking_style: "분석형", style_description: "", interests_summary: "", growth_tip: "" }
  try {
    const text = analysisResult.response.text().trim()
    const match = text.match(/\{[\s\S]*\}/)
    if (match) analysis = JSON.parse(match[0])
  } catch { /* use defaults */ }

  const profile = {
    interests: topTags,
    patterns: {
      peak_day: peakDay,
      peak_hour: parseInt(peakHour),
      avg_daily: Math.round((items.length / 90) * 10) / 10,
      type_distribution: typeCount,
      day_distribution: dayCount,
      hour_distribution: hourCount,
    },
    thinking_style: analysis.thinking_style,
    style_description: analysis.style_description,
    interests_summary: analysis.interests_summary,
    growth_tip: analysis.growth_tip,
    total_items: items.length,
    updated_at: new Date().toISOString(),
  }

  await supabase
    .from("user_settings")
    .update({ ai_profile: profile })
    .eq("user_id", user.id)

  return NextResponse.json(profile)
}
