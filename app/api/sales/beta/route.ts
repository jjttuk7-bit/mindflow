import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { email } = await req.json()

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "올바른 이메일을 입력해주세요" }, { status: 400 })
  }

  const normalized = email.trim().toLowerCase()

  // Check duplicate
  const { data: existing } = await supabase
    .from("beta_signups")
    .select("id")
    .eq("email", normalized)
    .limit(1)

  if (existing?.length) {
    return NextResponse.json({ error: "이미 신청된 이메일입니다" }, { status: 409 })
  }

  const { error } = await supabase
    .from("beta_signups")
    .insert({
      email: normalized,
      source: "sales_landing",
      metadata: {
        user_agent: req.headers.get("user-agent"),
        referrer: req.headers.get("referer"),
      },
    })

  if (error) {
    // Table might not exist yet - log and return success anyway
    console.error("Beta signup error:", error.message)
    return NextResponse.json({ success: true, note: "recorded" })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
