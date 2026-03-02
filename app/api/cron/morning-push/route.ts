import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Dynamic import to avoid Turbopack bundling issues with native Node.js modules
  const webPush = (await import("web-push")).default
  webPush.setVapidDetails(
    "mailto:support@mindflow.kr",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  const supabase = getServiceSupabase()

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ message: "No subscriptions", sent: 0 })
  }

  // Group subscriptions by user
  const userSubs = new Map<string, typeof subscriptions>()
  for (const sub of subscriptions) {
    const existing = userSubs.get(sub.user_id) || []
    existing.push(sub)
    userSubs.set(sub.user_id, existing)
  }

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let sent = 0
  let failed = 0

  for (const [userId, subs] of userSubs) {
    const { count: yesterdayCount } = await supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", yesterday.toISOString())
      .lt("created_at", today.toISOString())

    const { count: todoCount } = await supabase
      .from("todos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_completed", false)

    const items = yesterdayCount || 0
    const todos = todoCount || 0

    const parts: string[] = []
    if (items > 0) parts.push(`어제 ${items}개 저장`)
    if (todos > 0) parts.push(`미완료 할 일 ${todos}개`)
    if (parts.length === 0) parts.push("오늘도 좋은 아이디어를 기록해보세요")

    const payload = JSON.stringify({
      title: "좋은 아침이에요!",
      body: parts.join(" · "),
      url: "/",
    })

    for (const sub of subs) {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        )
        sent++
      } catch (err: unknown) {
        failed++
        const statusCode = (err as { statusCode?: number })?.statusCode
        // Clean up expired/invalid subscriptions
        if (statusCode === 410 || statusCode === 404) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint)
        }
      }
    }
  }

  return NextResponse.json({ sent, failed, users: userSubs.size })
}
