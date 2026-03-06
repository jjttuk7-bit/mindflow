import { getUser } from "@/lib/supabase/server"
import { validate } from "@/lib/validations"
import { customerUpdateSchema } from "@/lib/sales-validations"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  // Fetch customer with recent activities and follow-ups
  const { data: customer, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error) return NextResponse.json({ error: "Customer not found" }, { status: 404 })

  // Fetch related data in parallel
  const [activitiesRes, dealsRes, followUpsRes] = await Promise.all([
    supabase
      .from("activities")
      .select("*")
      .eq("customer_id", id)
      .eq("user_id", user.id)
      .order("occurred_at", { ascending: false })
      .limit(20),
    supabase
      .from("deals")
      .select("*")
      .eq("customer_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("follow_ups")
      .select("*")
      .eq("customer_id", id)
      .eq("user_id", user.id)
      .order("due_date", { ascending: true })
      .limit(10),
  ])

  return NextResponse.json({
    ...customer,
    activities: activitiesRes.data || [],
    deals: dealsRes.data || [],
    follow_ups: followUpsRes.data || [],
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const raw = await req.json()
  const parsed = validate(customerUpdateSchema, raw)
  if (!parsed.success) return parsed.error

  const { data, error } = await supabase
    .from("customers")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
