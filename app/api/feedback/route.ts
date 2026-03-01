import { getUser } from "@/lib/supabase/server"
import { rateLimit } from "@/lib/rate-limit"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { maxRequests: 5, windowMs: 60_000 })
  if (limited) return limited

  try {
    const { supabase, user } = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { category, message } = await req.json()

    if (!message?.trim() || message.trim().length < 2) {
      return NextResponse.json({ error: "메시지를 입력해주세요." }, { status: 400 })
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: "2000자 이내로 작성해주세요." }, { status: 400 })
    }

    const { error } = await supabase.from("feedback").insert({
      user_id: user.id,
      email: user.email,
      category: category || "general",
      message: message.trim(),
      page_url: req.headers.get("referer") || null,
      user_agent: req.headers.get("user-agent") || null,
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "피드백 전송에 실패했습니다." }, { status: 500 })
  }
}
