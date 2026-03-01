import { getUser } from "@/lib/supabase/server"
import { validate, settingsUpdateSchema } from "@/lib/validations"
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

  const raw = await req.json()
  const parsed = validate(settingsUpdateSchema, raw)
  if (!parsed.success) return parsed.error
  const allowed: Record<string, unknown> = { ...parsed.data }

  // Merge preferences with existing instead of replacing
  if (allowed.preferences) {
    const { data: current } = await supabase
      .from("user_settings")
      .select("preferences")
      .eq("user_id", user.id)
      .single()
    allowed.preferences = { ...(current?.preferences as Record<string, unknown> ?? {}), ...(allowed.preferences as Record<string, unknown>) }
  }

  const { data, error } = await supabase
    .from("user_settings")
    .update({ ...allowed, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
