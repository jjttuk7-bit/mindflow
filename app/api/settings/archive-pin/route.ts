import { getUser } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"

function hashPin(pin: string) {
  return createHash("sha256").update(pin).digest("hex")
}

export async function POST(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { pin } = body

  if (!pin || typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "PIN must be 4 digits" }, { status: 400 })
  }

  const hashed = hashPin(pin)

  // Get current preferences
  const { data: current } = await supabase
    .from("user_settings")
    .select("preferences")
    .eq("user_id", user.id)
    .single()

  const preferences = {
    ...((current?.preferences as Record<string, unknown>) ?? {}),
    archive_pin: hashed,
  }

  const { error } = await supabase
    .from("user_settings")
    .update({ preferences, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: current } = await supabase
    .from("user_settings")
    .select("preferences")
    .eq("user_id", user.id)
    .single()

  const preferences = { ...((current?.preferences as Record<string, unknown>) ?? {}) }
  delete preferences.archive_pin

  const { error } = await supabase
    .from("user_settings")
    .update({ preferences, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
