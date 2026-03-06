import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// Cron-style endpoint: checks all users' customers and generates alerts
// Can be called by Vercel Cron, external scheduler, or manually
export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Auth: either cron secret or authenticated user
  const cronSecret = req.headers.get("x-cron-secret")
  let userId: string | null = null

  if (cronSecret === process.env.CRON_SECRET) {
    // Cron mode: process all users (not implemented for now, single-user)
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id || null
  } else {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    userId = user.id
  }

  if (!userId) return NextResponse.json({ error: "No user" }, { status: 401 })

  const alerts: Array<{
    user_id: string
    customer_id: string
    type: string
    title: string
    message: string
    priority: string
    action_url: string
  }> = []

  // 1. No-contact warning: customers with no activity in 14+ days (grade S/A)
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, grade, company")
    .eq("user_id", userId)
    .in("grade", ["S", "A", "B"])

  if (customers) {
    for (const customer of customers) {
      const { data: lastActivity } = await supabase
        .from("activities")
        .select("occurred_at")
        .eq("customer_id", customer.id)
        .eq("user_id", userId)
        .order("occurred_at", { ascending: false })
        .limit(1)
        .single()

      const dayThreshold = customer.grade === "S" ? 7 : customer.grade === "A" ? 14 : 30
      const lastDate = lastActivity?.occurred_at ? new Date(lastActivity.occurred_at) : null
      const daysSince = lastDate
        ? Math.floor((Date.now() - lastDate.getTime()) / 86400000)
        : 999

      if (daysSince >= dayThreshold) {
        // Check if alert already exists today
        const today = new Date().toISOString().split("T")[0]
        const { data: existing } = await supabase
          .from("sales_alerts")
          .select("id")
          .eq("user_id", userId)
          .eq("customer_id", customer.id)
          .eq("type", "no_contact")
          .gte("created_at", today)
          .limit(1)

        if (!existing?.length) {
          alerts.push({
            user_id: userId,
            customer_id: customer.id,
            type: "no_contact",
            title: `${customer.name} 연락 필요`,
            message: lastDate
              ? `${daysSince}일째 연락이 없습니다 (${customer.grade}등급)`
              : `아직 활동 기록이 없습니다 (${customer.grade}등급)`,
            priority: customer.grade === "S" ? "urgent" : customer.grade === "A" ? "high" : "medium",
            action_url: `/sales/customers/${customer.id}`,
          })
        }
      }
    }
  }

  // 2. Overdue follow-ups
  const { data: overdueFollowUps } = await supabase
    .from("follow_ups")
    .select("id, title, customer_id, due_date, customers(name)")
    .eq("user_id", userId)
    .eq("status", "pending")
    .lt("due_date", new Date().toISOString())

  if (overdueFollowUps) {
    for (const fu of overdueFollowUps) {
      // Mark as overdue
      await supabase
        .from("follow_ups")
        .update({ status: "overdue" })
        .eq("id", fu.id)

      const customerName = (fu.customers as unknown as { name: string } | null)?.name || "고객"

      const today = new Date().toISOString().split("T")[0]
      const { data: existing } = await supabase
        .from("sales_alerts")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "follow_up_due")
        .eq("metadata->>follow_up_id", fu.id)
        .gte("created_at", today)
        .limit(1)

      if (!existing?.length) {
        alerts.push({
          user_id: userId,
          customer_id: fu.customer_id,
          type: "follow_up_due",
          title: `기한 초과: ${fu.title}`,
          message: `${customerName}의 할 일이 기한을 넘겼습니다`,
          priority: "high",
          action_url: `/sales/customers/${fu.customer_id}`,
        })
      }
    }
  }

  // 3. Deal deadline approaching (within 3 days)
  const threeDaysFromNow = new Date()
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

  const { data: approachingDeals } = await supabase
    .from("deals")
    .select("id, title, customer_id, expected_close_date, customers(name)")
    .eq("user_id", userId)
    .not("stage", "in", '("closed_won","closed_lost")')
    .not("expected_close_date", "is", null)
    .lte("expected_close_date", threeDaysFromNow.toISOString().split("T")[0])
    .gte("expected_close_date", new Date().toISOString().split("T")[0])

  if (approachingDeals) {
    for (const deal of approachingDeals) {
      const customerName = (deal.customers as unknown as { name: string } | null)?.name || "고객"
      const daysLeft = Math.ceil(
        (new Date(deal.expected_close_date!).getTime() - Date.now()) / 86400000
      )

      const today = new Date().toISOString().split("T")[0]
      const { data: existing } = await supabase
        .from("sales_alerts")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "deal_deadline")
        .eq("metadata->>deal_id", deal.id)
        .gte("created_at", today)
        .limit(1)

      if (!existing?.length) {
        alerts.push({
          user_id: userId,
          customer_id: deal.customer_id,
          type: "deal_deadline",
          title: `D-${daysLeft}: ${deal.title}`,
          message: `${customerName}의 딜 마감이 ${daysLeft}일 남았습니다`,
          priority: daysLeft <= 1 ? "urgent" : "high",
          action_url: `/sales/customers/${deal.customer_id}`,
        })
      }
    }
  }

  // Insert all alerts
  if (alerts.length > 0) {
    await supabase.from("sales_alerts").insert(alerts)
  }

  return NextResponse.json({
    generated: alerts.length,
    types: {
      no_contact: alerts.filter(a => a.type === "no_contact").length,
      follow_up_due: alerts.filter(a => a.type === "follow_up_due").length,
      deal_deadline: alerts.filter(a => a.type === "deal_deadline").length,
    },
  })
}
