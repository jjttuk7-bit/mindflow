import { getOpenAI, MODEL_MAP } from "@/lib/ai"
import { getUser } from "@/lib/supabase/server"
import { rateLimit } from "@/lib/rate-limit"
import { NextRequest, NextResponse } from "next/server"

type Mode = "briefing" | "roleplay" | "coaching" | "insight"

const SYSTEM_PROMPTS: Record<Mode, string> = {
  briefing: `당신은 영업 미팅 브리핑을 준비하는 AI 비서입니다.
고객 정보와 이력을 분석하여 미팅 준비 자료를 작성하세요.

아래 형식으로 브리핑을 작성하세요:

## 고객 요약
(고객의 핵심 정보와 최근 상태)

## 관계 히스토리
(주요 활동 타임라인과 패턴)

## 핵심 이슈 & 기회
(현재 진행 중인 딜, 약속, 우려사항)

## 미팅 전략
(접근 방법, 대화 포인트, 주의사항)

## 준비 체크리스트
(미팅 전 확인할 사항들)

간결하고 실행 가능한 내용으로 작성하세요. 한국어로 응답하세요.`,

  roleplay: `당신은 영업 롤플레이 시뮬레이션의 고객 역할을 합니다.
주어진 고객 프로필을 기반으로 현실적인 고객처럼 행동하세요.

규칙:
- 고객의 성격, 관심사, 우려사항을 반영하세요
- 적절한 반론, 가격 저항, 경쟁사 언급을 자연스럽게 하세요
- 너무 쉽게 설득되지 마세요 (현실적으로)
- 대화가 끝나면 [피드백] 태그로 영업 스킬 피드백을 제공하세요
- 한국어로 대화하세요
- 첫 메시지에서 고객으로서 자연스러운 인사를 하세요`,

  coaching: `당신은 영업 코치입니다. 미팅/통화 기록을 분석하여 개선점을 제시합니다.

분석 항목:
1. **커뮤니케이션 스타일**: 경청, 질문 기법, 공감 표현
2. **영업 기법**: 니즈 파악, 가치 제안, 클로징
3. **감정 분석**: 고객의 감정 변화, 긍정/부정 신호
4. **개선 포인트**: 구체적이고 실행 가능한 조언

형식:
## 전체 평가 (점수: X/10)
## 잘한 점
## 개선할 점
## 핵심 코칭 포인트
## 다음 미팅을 위한 액션 아이템

한국어로 분석하세요. 건설적이고 구체적인 피드백을 주세요.`,

  insight: `당신은 영업 데이터 분석가입니다. 고객 포트폴리오와 딜 현황을 분석하여 전략적 인사이트를 제공합니다.

분석 형식:
## 포트폴리오 요약
(고객 구성, 등급 분포, 건강도)

## 딜 파이프라인 분석
(단계별 현황, 예상 매출, 리스크)

## 활동 패턴
(연락 빈도, 선호 채널, 시간대)

## 강점 & 약점
(잘하고 있는 것, 개선 필요한 것)

## 전략 제안
(구체적인 액션 아이템 3-5개)

## 이번 주 우선순위
(가장 먼저 해야 할 것 3개)

한국어로 작성하세요. 데이터 기반으로 구체적인 인사이트를 제공하세요.`,
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { maxRequests: 20, windowMs: 60_000 })
  if (limited) return limited

  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { mode, customer_id, message } = await req.json() as {
    mode: Mode
    customer_id?: string
    message?: string
  }

  if (!mode || !SYSTEM_PROMPTS[mode]) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 })
  }

  try {
    let contextData = ""

    if (customer_id) {
      // Fetch customer context
      const [customerRes, activitiesRes, dealsRes, followUpsRes] = await Promise.all([
        supabase.from("customers").select("*").eq("id", customer_id).eq("user_id", user.id).single(),
        supabase.from("activities").select("type, content, summary, occurred_at, duration_min")
          .eq("customer_id", customer_id).eq("user_id", user.id)
          .order("occurred_at", { ascending: false }).limit(20),
        supabase.from("deals").select("title, amount, stage, probability, expected_close_date, notes")
          .eq("customer_id", customer_id).eq("user_id", user.id),
        supabase.from("follow_ups").select("title, status, due_date, priority, description")
          .eq("customer_id", customer_id).eq("user_id", user.id),
      ])

      const c = customerRes.data
      if (c) {
        contextData = `
[고객 정보]
이름: ${c.name}
회사: ${c.company || "미상"}
직함: ${c.role || "미상"}
등급: ${c.grade}
유입: ${c.source}
메모: ${c.notes || "없음"}
등록일: ${new Date(c.created_at).toLocaleDateString("ko-KR")}

[활동 이력 (최근 ${(activitiesRes.data || []).length}건)]
${(activitiesRes.data || []).map(a =>
  `- ${new Date(a.occurred_at).toLocaleDateString("ko-KR")} ${a.type}: ${a.summary || a.content.slice(0, 150)}`
).join("\n") || "없음"}

[딜 현황]
${(dealsRes.data || []).map(d =>
  `- ${d.title} | ${d.stage} | ${d.amount ? d.amount.toLocaleString() + "원" : "미정"} | 확률 ${d.probability}%${d.expected_close_date ? " | 마감 " + d.expected_close_date : ""}`
).join("\n") || "없음"}

[할 일]
${(followUpsRes.data || []).map(f =>
  `- [${f.status}] ${f.title} (${f.priority}) ${f.due_date}`
).join("\n") || "없음"}
`
      }
    }

    if (mode === "insight" && !customer_id) {
      // Portfolio-wide insight: fetch all customers
      const [customersRes, allDealsRes, allActivitiesRes] = await Promise.all([
        supabase.from("customers").select("name, grade, company, source, created_at")
          .eq("user_id", user.id).order("grade"),
        supabase.from("deals").select("title, amount, stage, probability, customer_id, expected_close_date")
          .eq("user_id", user.id),
        supabase.from("activities").select("type, occurred_at, customer_id")
          .eq("user_id", user.id)
          .order("occurred_at", { ascending: false }).limit(100),
      ])

      const customers = customersRes.data || []
      const gradeDist = customers.reduce((acc, c) => {
        acc[c.grade] = (acc[c.grade] || 0) + 1; return acc
      }, {} as Record<string, number>)

      contextData = `
[고객 포트폴리오 (${customers.length}명)]
등급 분포: ${Object.entries(gradeDist).map(([g, n]) => `${g}: ${n}명`).join(", ")}
유입 경로: ${customers.reduce((acc, c) => {
  acc[c.source] = (acc[c.source] || 0) + 1; return acc
}, {} as Record<string, number>)}

[딜 파이프라인 (${(allDealsRes.data || []).length}건)]
${["lead", "contact", "proposal", "negotiation", "closed_won", "closed_lost"].map(stage => {
  const deals = (allDealsRes.data || []).filter(d => d.stage === stage)
  const total = deals.reduce((s, d) => s + (d.amount || 0), 0)
  return deals.length > 0 ? `- ${stage}: ${deals.length}건 (${total.toLocaleString()}원)` : null
}).filter(Boolean).join("\n")}

[최근 활동 패턴]
총 활동: ${(allActivitiesRes.data || []).length}건
유형별: ${(allActivitiesRes.data || []).reduce((acc, a) => {
  acc[a.type] = (acc[a.type] || 0) + 1; return acc
}, {} as Record<string, number>)}

오늘: ${new Date().toISOString().split("T")[0]}
`
    }

    const openai = getOpenAI()

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPTS[mode] },
    ]

    if (contextData) {
      messages.push({ role: "user", content: contextData })
    }

    if (message) {
      messages.push({ role: "user", content: message })
    } else if (mode === "briefing") {
      messages.push({ role: "user", content: "이 고객과의 다음 미팅을 위한 브리핑을 작성해주세요." })
    } else if (mode === "coaching") {
      messages.push({ role: "user", content: "최근 활동 기록을 분석하고 영업 코칭을 제공해주세요." })
    } else if (mode === "insight") {
      messages.push({ role: "user", content: "전체 영업 현황을 분석하고 전략적 인사이트를 제공해주세요." })
    }

    const response = await openai.chat.completions.create({
      model: mode === "roleplay" ? MODEL_MAP.chat : MODEL_MAP.content,
      messages,
      temperature: mode === "roleplay" ? 0.8 : 0.5,
      max_tokens: 2000,
    })

    return NextResponse.json({
      content: response.choices[0].message.content,
      mode,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "AI partner failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
