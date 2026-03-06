import { getOpenAI, MODEL_MAP } from "@/lib/ai"
import { getUser } from "@/lib/supabase/server"
import { rateLimit } from "@/lib/rate-limit"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { maxRequests: 10, windowMs: 60_000 })
  if (limited) return limited

  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { customer_id } = await req.json()

  if (!customer_id) {
    return NextResponse.json({ error: "customer_id is required" }, { status: 400 })
  }

  // Fetch customer + activities
  const [customerRes, activitiesRes, dealsRes, followUpsRes] = await Promise.all([
    supabase
      .from("customers")
      .select("*")
      .eq("id", customer_id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("activities")
      .select("type, content, occurred_at, duration_min")
      .eq("customer_id", customer_id)
      .eq("user_id", user.id)
      .order("occurred_at", { ascending: false })
      .limit(20),
    supabase
      .from("deals")
      .select("title, stage, amount, expected_close_date")
      .eq("customer_id", customer_id)
      .eq("user_id", user.id),
    supabase
      .from("follow_ups")
      .select("title, status, due_date, priority")
      .eq("customer_id", customer_id)
      .eq("user_id", user.id)
      .eq("status", "pending"),
  ])

  const customer = customerRes.data
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 })

  const activities = activitiesRes.data || []
  const deals = dealsRes.data || []
  const followUps = followUpsRes.data || []

  try {
    const openai = getOpenAI()

    const activitySummary = activities.slice(0, 10).map(a =>
      `- ${new Date(a.occurred_at).toLocaleDateString("ko-KR")}: ${a.type} - ${a.content.slice(0, 100)}`
    ).join("\n")

    const response = await openai.chat.completions.create({
      model: MODEL_MAP.summary,
      messages: [
        {
          role: "system",
          content: `당신은 영업 코치입니다. 고객과의 활동 이력을 분석하여 최적의 연락 타이밍과 방법을 추천하세요.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "recommended_contact_date": "YYYY-MM-DD",
  "recommended_method": "call|meeting|email|message",
  "reason": "추천 이유 (1-2문장)",
  "talking_points": ["대화 포인트 3개 이내"],
  "risk_level": "low|medium|high",
  "risk_reason": "위험 요인 (없으면 null)",
  "relationship_health": "excellent|good|fair|poor",
  "contact_pattern": "연락 패턴 분석 (1문장)"
}`,
        },
        {
          role: "user",
          content: `고객 정보:
이름: ${customer.name}
회사: ${customer.company || "미상"}
등급: ${customer.grade}
메모: ${customer.notes || "없음"}

최근 활동 (${activities.length}건):
${activitySummary || "활동 기록 없음"}

진행 중인 딜: ${deals.filter(d => !["closed_won", "closed_lost"].includes(d.stage)).map(d => `${d.title} (${d.stage})`).join(", ") || "없음"}

미완료 할 일: ${followUps.map(f => `${f.title} (${f.due_date}까지)`).join(", ") || "없음"}

오늘 날짜: ${new Date().toISOString().split("T")[0]}`,
        },
      ],
      temperature: 0.4,
      response_format: { type: "json_object" },
    })

    const result = JSON.parse(response.choices[0].message.content || "{}")
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI timing analysis failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
