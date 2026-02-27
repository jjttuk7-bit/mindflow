import { getUser } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { itemId } = await req.json()

  // Check if already shared
  const { data: existing } = await supabase
    .from("shared_items")
    .select("token")
    .eq("item_id", itemId)
    .single()

  if (existing) {
    return NextResponse.json({ token: existing.token })
  }

  // Create new share token
  const { data, error } = await supabase
    .from("shared_items")
    .insert({ item_id: itemId })
    .select("token")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ token: data.token })
}
