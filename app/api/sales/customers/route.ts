import { getUser } from "@/lib/supabase/server"
import { validate } from "@/lib/validations"
import { customerCreateSchema } from "@/lib/sales-validations"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const raw = await req.json()
  const parsed = validate(customerCreateSchema, raw)
  if (!parsed.success) return parsed.error
  const body = parsed.data

  // Clean empty email
  if (body.email === "") delete (body as Record<string, unknown>).email

  const { data, error } = await supabase
    .from("customers")
    .insert({ ...body, user_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

export async function GET(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const grade = searchParams.get("grade")
  const search = searchParams.get("q")
  const limit = parseInt(searchParams.get("limit") || "50")
  const offset = parseInt(searchParams.get("offset") || "0")

  let query = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (grade) query = query.eq("grade", grade)
  if (search) query = query.or(`name.ilike.%${search}%,company.ilike.%${search}%,phone.ilike.%${search}%`)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const customers = data || []

  // Enrich with activity stats and pending follow-ups
  if (customers.length > 0) {
    const ids = customers.map((c) => c.id)

    const [activitiesRes, followUpsRes] = await Promise.all([
      supabase
        .from("activities")
        .select("customer_id, occurred_at, type")
        .eq("user_id", user.id)
        .in("customer_id", ids)
        .order("occurred_at", { ascending: false }),
      supabase
        .from("follow_ups")
        .select("customer_id")
        .eq("user_id", user.id)
        .in("customer_id", ids)
        .in("status", ["pending", "overdue"]),
    ])

    const activityMap = new Map<string, { last_at: string; last_type: string; count: number }>()
    for (const a of activitiesRes.data || []) {
      const existing = activityMap.get(a.customer_id)
      if (!existing) {
        activityMap.set(a.customer_id, { last_at: a.occurred_at, last_type: a.type, count: 1 })
      } else {
        existing.count++
      }
    }

    const followUpMap = new Map<string, number>()
    for (const f of followUpsRes.data || []) {
      followUpMap.set(f.customer_id, (followUpMap.get(f.customer_id) || 0) + 1)
    }

    for (const c of customers) {
      const act = activityMap.get(c.id)
      ;(c as Record<string, unknown>).last_activity_at = act?.last_at || null
      ;(c as Record<string, unknown>).last_activity_type = act?.last_type || null
      ;(c as Record<string, unknown>).activity_count = act?.count || 0
      ;(c as Record<string, unknown>).pending_follow_ups = followUpMap.get(c.id) || 0
    }
  }

  return NextResponse.json({ customers, total: count || 0 })
}
