import { getUser } from "@/lib/supabase/server"
import { getOpenAI, MODEL_MAP } from "@/lib/ai"
import { NextResponse } from "next/server"

export async function POST() {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // 유저의 태그 + count 가져오기
  const { data: tagData, error } = await supabase
    .from("tags")
    .select("name, item_tags!inner(item_id, items!inner(user_id))")
    .eq("item_tags.items.user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // 태그별 count 집계
  const countMap = new Map<string, number>()
  for (const tag of tagData || []) {
    countMap.set(tag.name, (countMap.get(tag.name) ?? 0) + (tag.item_tags?.length ?? 1))
  }

  const tagList = Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([name, count]) => `${name}(${count})`)
    .join(", ")

  if (!tagList) {
    return NextResponse.json({ interests: [], gaps: [] })
  }

  const openai = getOpenAI()
  const completion = await openai.chat.completions.create({
    model: MODEL_MAP.analysis,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `당신은 사용자의 지식 관리 패턴을 분석하는 AI입니다.
태그 목록(태그명(빈도)) 을 보고 JSON으로 응답하세요.

응답 형식:
{
  "interests": [
    { "area": "영역명", "summary": "이 영역에 대한 한 문장 설명" }
  ],
  "gaps": [
    { "area": "부족한 영역명", "reason": "왜 추가하면 좋은지 한 문장" }
  ]
}

- interests: 상위 3~5개 관심 영역. 비슷한 태그들을 하나의 영역으로 묶어서.
- gaps: 현재 태그 패턴에서 자연스럽게 연결되지만 없는 영역 2~3개.
- 한국어로 응답.`,
      },
      {
        role: "user",
        content: `내 태그 목록: ${tagList}`,
      },
    ],
  })

  try {
    const raw = completion.choices[0]?.message?.content || "{}"
    const result = JSON.parse(raw)
    return NextResponse.json({
      interests: result.interests || [],
      gaps: result.gaps || [],
    })
  } catch {
    return NextResponse.json({ interests: [], gaps: [] })
  }
}
