import { getUser } from "@/lib/supabase/server"
import { validate } from "@/lib/validations"
import { dealCreateSchema } from "@/lib/sales-validations"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const raw = await req.json()
  const parsed = validate(dealCreateSchema, raw)
  if (!parsed.success) return parsed.error

  const { data, error } = await supabase
    .from("deals")
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

export async function GET(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const stage = searchParams.get("stage")
  const customerId = searchParams.get("customer_id")

  let query = supabase
    .from("deals")
    .select("*, customers(id, name, company, grade)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })

  if (stage) query = query.eq("stage", stage)
  if (customerId) query = query.eq("customer_id", customerId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json(data || [])
}
