import { getUser } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import crypto from "crypto"

const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || ""

export async function POST() {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Generate random 32-char hex token
  const token = crypto.randomBytes(16).toString("hex")

  // Store token in user_settings.preferences using jsonb merge
  const { data: existing } = await supabase
    .from("user_settings")
    .select("preferences")
    .eq("user_id", user.id)
    .single()

  const currentPrefs = (existing?.preferences as Record<string, unknown>) || {}
  const updatedPrefs = {
    ...currentPrefs,
    telegram_link_token: token,
  }

  const { error } = await supabase
    .from("user_settings")
    .update({
      preferences: updatedPrefs,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const link = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${token}`

  return NextResponse.json({ token, link })
}
