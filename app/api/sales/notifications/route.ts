import { getUser } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const status = searchParams.get("status")
  const limit = parseInt(searchParams.get("limit") || "20")

  let query = supabase
    .from("sales_alerts")
    .select("*, customers(id, name, grade, company)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (status) {
    query = query.eq("status", status)
  } else {
    // Default: show unread and read, not dismissed
    query = query.in("status", ["unread", "read"])
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Count unread
  const { count } = await supabase
    .from("sales_alerts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "unread")

  return NextResponse.json({
    alerts: data || [],
    unread_count: count || 0,
  })
}

export async function PATCH(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { ids, status } = await req.json()

  if (!ids?.length || !["read", "dismissed", "actioned"].includes(status)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const { error } = await supabase
    .from("sales_alerts")
    .update({ status })
    .in("id", ids)
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
