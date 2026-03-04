import { getUser } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const type = req.nextUrl.searchParams.get("type") || "monthly"

  const { data, error } = await supabase
    .from("insight_reports")
    .select("id, month, report_type, created_at")
    .eq("user_id", user.id)
    .eq("report_type", type)
    .order("month", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data || [])
}
