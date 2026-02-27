import { getUser } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (error) {
    const { data: created, error: createErr } = await supabase
      .from("user_settings")
      .insert({ user_id: user.id })
      .select()
      .single()
    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 })
    return NextResponse.json(created)
  }

  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const updates = await req.json()
  const allowed = { preferences: updates.preferences }

  const { data, error } = await supabase
    .from("user_settings")
    .update({ ...allowed, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
