import { getUser } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// Get unread nudges
export async function GET() {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data } = await supabase
    .from("nudges")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(5)

  return NextResponse.json(data || [])
}

// Mark nudge as read
export async function PATCH(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await req.json()
  await supabase
    .from("nudges")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", user.id)

  return NextResponse.json({ ok: true })
}
