import { getUser } from "@/lib/supabase/server"
import { validate } from "@/lib/validations"
import { activityCreateSchema } from "@/lib/sales-validations"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const raw = await req.json()
  const parsed = validate(activityCreateSchema, raw)
  if (!parsed.success) return parsed.error

  const body = {
    ...parsed.data,
    user_id: user.id,
    occurred_at: parsed.data.occurred_at || new Date().toISOString(),
    metadata: parsed.data.metadata || {},
  }

  const { data, error } = await supabase
    .from("activities")
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

export async function GET(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const customerId = searchParams.get("customer_id")
  const type = searchParams.get("type")
  const limit = parseInt(searchParams.get("limit") || "30")

  let query = supabase
    .from("activities")
    .select("*, customers(id, name, company)")
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false })
    .limit(limit)

  if (customerId) query = query.eq("customer_id", customerId)
  if (type) query = query.eq("type", type)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json(data || [])
}
