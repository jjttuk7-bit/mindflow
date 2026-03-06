import { getOpenAI } from "@/lib/ai"
import { getUser } from "@/lib/supabase/server"
import { rateLimit } from "@/lib/rate-limit"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { maxRequests: 10, windowMs: 60_000 })
  if (limited) return limited

  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get("image") as File | null

  if (!file || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "이미지 파일을 업로드해주세요" }, { status: 400 })
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")

    const openai = getOpenAI()
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `명함 이미지에서 정보를 추출하세요.
반드시 아래 JSON 형식으로만 응답하세요:
{
  "name": "이름 (필수)",
  "company": "회사명 (없으면 null)",
  "role": "직함/직책 (없으면 null)",
  "phone": "전화번호 (없으면 null)",
  "email": "이메일 (없으면 null)",
  "address": "주소 (없으면 null)",
  "website": "웹사이트 (없으면 null)",
  "confidence": 0.95
}
이름이 감지되지 않으면 name을 null로 설정하세요.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "이 명함에서 정보를 추출해주세요." },
            {
              type: "image_url",
              image_url: { url: `data:${file.type};base64,${base64}` },
            },
          ],
        },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    })

    const extracted = JSON.parse(response.choices[0].message.content || "{}")

    if (!extracted.name) {
      return NextResponse.json({ error: "명함에서 이름을 인식할 수 없습니다" }, { status: 400 })
    }

    // Auto-create customer
    const { data: customer, error } = await supabase
      .from("customers")
      .insert({
        user_id: user.id,
        name: extracted.name,
        company: extracted.company,
        role: extracted.role,
        phone: extracted.phone,
        email: extracted.email,
        grade: "C",
        source: "other",
        notes: extracted.address ? `주소: ${extracted.address}` : null,
        metadata: {
          from_business_card: true,
          website: extracted.website,
          ocr_confidence: extracted.confidence,
        },
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({
      customer,
      extracted,
    }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "명함 인식에 실패했습니다"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
