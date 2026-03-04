import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export const dynamic = "force-dynamic"

const ALERT_DAYS = [14, 7, 3, 1, 0] as const

function buildNudgeContent(vendor?: string, amount?: string, daysLeft: number = 0): { title: string; content: string } {
  const label = [vendor, amount].filter(Boolean).join(" ")
  if (daysLeft === 0) {
    return {
      title: "🎫 쿠폰 만료",
      content: label ? `${label} 기프티콘이 오늘 만료되었습니다` : "기프티콘이 오늘 만료되었습니다",
    }
  }
  return {
    title: "🎫 쿠폰 만료 임박",
    content: label
      ? `${label} 기프티콘이 ${daysLeft}일 뒤 만료됩니다`
      : `기프티콘이 ${daysLeft}일 뒤 만료됩니다`,
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const webPush = (await import("web-push")).default
  webPush.setVapidDetails(
    "mailto:support@mindflow.kr",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  const supabase = getServiceSupabase()

  // Find all non-archived, non-deleted items with expiry metadata
  const { data: items, error } = await supabase
    .from("items")
    .select("id, user_id, metadata, is_archived")
    .is("deleted_at", null)
    .eq("is_archived", false)
    .not("metadata->expiry->expiry_date", "is", null)

  if (error || !items || items.length === 0) {
    return NextResponse.json({ message: "No expiry items", checked: 0, nudges: 0, pushes: 0 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let nudgesCreated = 0
  let pushesSent = 0

  for (const item of items) {
    const meta = item.metadata as Record<string, unknown>
    const expiry = meta?.expiry as { expiry_date: string; expiry_type?: string; vendor?: string; amount?: string } | undefined
    if (!expiry?.expiry_date) continue

    const expiryDate = new Date(expiry.expiry_date)
    expiryDate.setHours(0, 0, 0, 0)
    const diffTime = expiryDate.getTime() - today.getTime()
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // Skip items that expired more than a day ago (already handled)
    if (daysLeft < 0) continue

    // Check if this is an alert day
    if (!ALERT_DAYS.includes(daysLeft as typeof ALERT_DAYS[number])) continue

    // Check for duplicate nudge (same item + same daysLeft)
    const { count: existingCount } = await supabase
      .from("nudges")
      .select("id", { count: "exact", head: true })
      .eq("user_id", item.user_id)
      .eq("type", "expiry")
      .like("content", `%${daysLeft === 0 ? "오늘 만료" : `${daysLeft}일 뒤 만료`}%`)
      .contains("related_item_ids", [item.id])

    if (existingCount && existingCount > 0) continue

    // Build nudge content
    const { title, content } = buildNudgeContent(expiry.vendor, expiry.amount, daysLeft)

    // Create nudge
    await supabase.from("nudges").insert({
      user_id: item.user_id,
      type: "expiry",
      title,
      content,
      related_item_ids: [item.id],
      is_read: false,
    })
    nudgesCreated++

    // If expired (D-0), archive the item
    if (daysLeft === 0) {
      await supabase
        .from("items")
        .update({ is_archived: true })
        .eq("id", item.id)
    }

    // Send push notification
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", item.user_id)

    if (subs && subs.length > 0) {
      const payload = JSON.stringify({
        title: "🎫 쿠폰 만료 알림",
        body: content,
        url: `/item/${item.id}`,
        tag: "expiry",
      })

      for (const sub of subs) {
        try {
          await webPush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          )
          pushesSent++
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number })?.statusCode
          if (statusCode === 410 || statusCode === 404) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint)
          }
        }
      }
    }
  }

  return NextResponse.json({ checked: items.length, nudges: nudgesCreated, pushes: pushesSent })
}
