import { getUser } from "@/lib/supabase/server"
import { getUserPlan, PLAN_LIMITS } from "@/lib/plans"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("projects")
    .select("*, items(count)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const plan = await getUserPlan(user.id)
  const limit = PLAN_LIMITS[plan].projects

  if (limit !== Infinity) {
    const { count } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)

    if ((count || 0) >= limit) {
      return NextResponse.json(
        { error: `Free plan is limited to ${limit} projects. Upgrade to Pro for unlimited projects.` },
        { status: 403 }
      )
    }
  }

  const body = await req.json()
  const { name, color = "#8B7355", description } = body

  const { data, error } = await supabase
    .from("projects")
    .insert({ name, color, description, is_auto: false, user_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
