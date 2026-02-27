import { getUser } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase.from("tags").select("*").order("name")
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
