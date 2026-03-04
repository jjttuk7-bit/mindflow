import { getUser } from "@/lib/supabase/server"
import { getUserPlan, PLAN_LIMITS } from "@/lib/plans"
import { getOpenAI, MODEL_MAP } from "@/lib/ai"
import { NextResponse } from "next/server"
import type { AIProfileData, AIProfileSnapshot } from "@/lib/supabase/types"

// ─── Helpers ────────────────────────────────────────────────────────

function computeTimePersona(hourDist: Record<number, number>): { label: string; emoji: string; period: string } {
  const periods = [
    { range: [5, 11], label: "아침형 플래너", emoji: "🌅", period: "morning" },
    { range: [12, 16], label: "오후형 리서처", emoji: "☀️", period: "afternoon" },
    { range: [17, 21], label: "저녁형 씽커", emoji: "🌆", period: "evening" },
    { range: [22, 28], label: "새벽형 딥워커", emoji: "🌙", period: "night" }, // 22-4 (28=4+24)
  ]

  const periodSums: Record<string, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 }
  for (const [hStr, count] of Object.entries(hourDist)) {
    const h = Number(hStr)
    if (h >= 5 && h <= 11) periodSums.morning += count
    else if (h >= 12 && h <= 16) periodSums.afternoon += count
    else if (h >= 17 && h <= 21) periodSums.evening += count
    else periodSums.night += count // 0-4, 22-23
  }

  const peak = Object.entries(periodSums).sort((a, b) => b[1] - a[1])[0]?.[0] || "morning"
  return periods.find((p) => p.period === peak) || periods[0]
}

function computeDiversityScore(
  tagCount: Record<string, number>,
  typeCount: Record<string, number>,
  totalItems: number
): { score: number; label: string; unique_tags: number; unique_types: number } {
  const uniqueTags = Object.keys(tagCount).length
  const uniqueTypes = Object.keys(typeCount).length

  // Tag ratio (40%): unique tags / expected (sqrt of total as baseline)
  const expectedTags = Math.max(Math.sqrt(totalItems) * 1.5, 1)
  const tagRatio = Math.min(uniqueTags / expectedTags, 1)

  // Type ratio (20%): unique types / 4
  const typeRatio = Math.min(uniqueTypes / 4, 1)

  // Tag entropy (40%): Shannon entropy normalized
  const tagValues = Object.values(tagCount)
  const tagTotal = tagValues.reduce((s, v) => s + v, 0)
  let entropy = 0
  if (tagTotal > 0 && tagValues.length > 1) {
    for (const v of tagValues) {
      const p = v / tagTotal
      if (p > 0) entropy -= p * Math.log2(p)
    }
    const maxEntropy = Math.log2(tagValues.length)
    entropy = maxEntropy > 0 ? entropy / maxEntropy : 0
  }

  const score = Math.round(tagRatio * 40 + typeRatio * 20 + entropy * 40)

  let label: string
  if (score >= 80) label = "다양한 탐험가"
  else if (score >= 60) label = "균형 잡힌 학습자"
  else if (score >= 40) label = "집중형 연구자"
  else label = "깊이 있는 전문가"

  return { score, label, unique_tags: uniqueTags, unique_types: uniqueTypes }
}

// ─── GET: Retrieve profile (Free tier gets basic stats) ─────────────

export async function GET() {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // TODO: 테스트 후 플랜 체크 복원
  // const plan = await getUserPlan(user.id)

  const { data } = await supabase
    .from("user_settings")
    .select("ai_profile")
    .eq("user_id", user.id)
    .single()

  const profile = data?.ai_profile as AIProfileData | null

  // 테스트: 모든 유저에게 전체 프로필 반환
  return NextResponse.json(profile || {})

  /* TODO: 테스트 후 Free 유저 기본 통계 로직 복원
  // Free user: return basic stats only
  if (profile) {
    return NextResponse.json({
      interests: profile.interests?.slice(0, 3) || [],
      patterns: profile.patterns || null,
      total_items: profile.total_items || 0,
      updated_at: profile.updated_at || null,
      _plan: "free",
    })
  }

  // Free user with no profile: compute basic stats on the fly
  ...
  */
}

// ─── POST: Trigger re-analysis (Pro only) ───────────────────────────

export async function POST() {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // TODO: 테스트 후 플랜 체크 복원
  // const plan = await getUserPlan(user.id)
  // if (!PLAN_LIMITS[plan].ai_profile) {
  //   return NextResponse.json({ error: "Pro 플랜에서 사용할 수 있습니다", upgrade: true }, { status: 403 })
  // }

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
  const peakHour = Number(Object.entries(hourCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "9")

  // Time persona
  const timePersonaBase = computeTimePersona(hourCount)

  // Diversity score
  const diversity = computeDiversityScore(tagCount, typeCount, items.length)

  // AI analysis with enhanced prompt
  const summaries = items
    .slice(0, 50)
    .map((i) => i.summary || i.content?.slice(0, 80))
    .join("\n")

  const analysisResult = await getOpenAI().chat.completions.create({
    model: MODEL_MAP.analysis,
    messages: [{
      role: "user",
      content: `사용자가 최근 기록한 내용을 분석해주세요.

기록 통계:
- 총 ${items.length}개, 일평균 ${Math.round((items.length / 90) * 10) / 10}개
- 유형: 텍스트 ${typeCount["text"] || 0}, 링크 ${typeCount["link"] || 0}, 이미지 ${typeCount["image"] || 0}, 음성 ${typeCount["voice"] || 0}
- 피크 시간: ${peakDay}요일 ${peakHour}시
- 고유 태그: ${Object.keys(tagCount).length}개

내용 요약:
${summaries}

JSON만 반환:
{
  "thinking_style": "사고 성향 한 단어",
  "style_description": "사고 성향 설명 (2문장)",
  "interests_summary": "관심 분야 요약 (2-3문장, 구체적 추천 포함)",
  "growth_tip": "다음 단계 제안 (구체적 액션 1개)",
  "dimensions": {
    "explorer": 0-100,
    "executor": 0-100,
    "creator": 0-100,
    "analyst": 0-100,
    "connector": 0-100
  },
  "time_persona_description": "시간대 활용 패턴 한 줄 설명"
}`,
    }],
  })

  let analysis = {
    thinking_style: "분석형",
    style_description: "",
    interests_summary: "",
    growth_tip: "",
    dimensions: { explorer: 50, executor: 50, creator: 50, analyst: 50, connector: 50 },
    time_persona_description: "",
  }
  try {
    const text = analysisResult.choices[0].message.content?.trim() || ""
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0])
      analysis = { ...analysis, ...parsed }
      // Clamp dimension values to 0-100
      if (parsed.dimensions) {
        for (const key of Object.keys(analysis.dimensions) as Array<keyof typeof analysis.dimensions>) {
          analysis.dimensions[key] = Math.max(0, Math.min(100, Number(parsed.dimensions[key]) || 50))
        }
      }
    }
  } catch { /* use defaults */ }

  // Load existing profile for history
  const { data: existing } = await supabase
    .from("user_settings")
    .select("ai_profile")
    .eq("user_id", user.id)
    .single()

  const existingProfile = existing?.ai_profile as AIProfileData | null
  const existingHistory: AIProfileSnapshot[] = existingProfile?.history || []

  // Create snapshot from current analysis
  const snapshot: AIProfileSnapshot = {
    date: new Date().toISOString().split("T")[0],
    dimensions: analysis.dimensions,
    top_topics: topTags.slice(0, 5).map((t) => t.topic),
    total_items: items.length,
    diversity_score: diversity.score,
  }

  // Keep max 6 snapshots (push new, trim old)
  const history = [...existingHistory, snapshot].slice(-6)

  const profile: AIProfileData = {
    interests: topTags,
    patterns: {
      peak_day: peakDay,
      peak_hour: peakHour,
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
    dimensions: analysis.dimensions,
    time_persona: {
      label: timePersonaBase.label,
      emoji: timePersonaBase.emoji,
      description: analysis.time_persona_description || `${timePersonaBase.label} 스타일로 활동합니다.`,
    },
    diversity_score: diversity,
    history,
  }

  await supabase
    .from("user_settings")
    .update({ ai_profile: profile })
    .eq("user_id", user.id)

  return NextResponse.json(profile)
}
