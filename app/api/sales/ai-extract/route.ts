import { getOpenAI, MODEL_MAP } from "@/lib/ai"
import { getUser } from "@/lib/supabase/server"
import { rateLimit } from "@/lib/rate-limit"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { maxRequests: 10, windowMs: 60_000 })
  if (limited) return limited

  const { user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { content, type } = await req.json()

  if (!content || typeof content !== "string") {
    return NextResponse.json({ error: "content is required" }, { status: 400 })
  }

  try {
    const openai = getOpenAI()
    const response = await openai.chat.completions.create({
      model: MODEL_MAP.summary,
      messages: [
        {
          role: "system",
          content: `당신은 영업 미팅 노트를 분석하는 AI입니다.
주어진 텍스트에서 영업에 중요한 정보를 추출하세요.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "summary": "1-2문장 핵심 요약",
  "customer_name": "감지된 고객/담당자 이름 (없으면 null)",
  "company": "감지된 회사명 (없으면 null)",
  "promises": ["약속/후속조치 목록"],
  "budget": "감지된 예산/금액 (없으면 null)",
  "competitors": ["언급된 경쟁사 목록"],
  "next_steps": ["다음 단계 목록"],
  "sentiment": "positive|neutral|negative",
  "key_topics": ["핵심 주제 3개 이내"]
}`,
        },
        {
          role: "user",
          content: `[${type || "meeting"} 기록]\n${content}`,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    })

    const result = JSON.parse(response.choices[0].message.content || "{}")
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI extraction failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
