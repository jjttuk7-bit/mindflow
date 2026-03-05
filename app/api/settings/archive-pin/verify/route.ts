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

  const { data } = await supabase
    .from("user_settings")
    .select("preferences")
    .eq("user_id", user.id)
    .single()

  const storedHash = (data?.preferences as Record<string, unknown>)?.archive_pin as string | undefined
  if (!storedHash) {
    return NextResponse.json({ valid: false, error: "No PIN set" }, { status: 400 })
  }

  const valid = hashPin(pin) === storedHash
  return NextResponse.json({ valid })
}
