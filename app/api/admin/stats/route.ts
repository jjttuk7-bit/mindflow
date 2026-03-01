import { getUser } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const { user } = await getUser()
  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const supabase = getServiceClient()

  // Parallel queries for stats
  const [usersRes, itemsRes, settingsRes, todosRes, chatSessionsRes, recentItemsRes] = await Promise.all([
    supabase.auth.admin.listUsers({ perPage: 1000 }),
    supabase.from("items").select("id, type, source, created_at", { count: "exact", head: false }).limit(0),
    supabase.from("user_settings").select("plan, created_at"),
    supabase.from("todos").select("id, is_completed", { count: "exact" }).limit(0),
    supabase.from("chat_sessions").select("id", { count: "exact" }).limit(0),
    supabase.from("items").select("id, type, created_at").order("created_at", { ascending: false }).limit(100),
  ])

  const users = usersRes.data?.users ?? []
  const settings = settingsRes.data ?? []

  // User stats
  const totalUsers = users.length
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const newUsersWeek = users.filter((u) => new Date(u.created_at) >= weekAgo).length
  const newUsersMonth = users.filter((u) => new Date(u.created_at) >= monthAgo).length
  const proUsers = settings.filter((s) => s.plan === "pro").length

  // Item stats from count
  const totalItems = itemsRes.count ?? 0
  const totalTodos = todosRes.count ?? 0
  const totalChatSessions = chatSessionsRes.count ?? 0

  // Recent items breakdown by type (last 100)
  const recentItems = recentItemsRes.data ?? []
  const recentByType: Record<string, number> = {}
  for (const item of recentItems) {
    recentByType[item.type] = (recentByType[item.type] ?? 0) + 1
  }

  // Daily signups (last 14 days)
  const dailySignups: Record<string, number> = {}
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    dailySignups[key] = 0
  }
  for (const u of users) {
    const key = u.created_at.slice(0, 10)
    if (key in dailySignups) {
      dailySignups[key]++
    }
  }

  // Recent users (last 10)
  const recentUsers = users
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)
    .map((u) => ({
      email: u.email,
      created_at: u.created_at,
      last_sign_in: u.last_sign_in_at,
    }))

  return NextResponse.json({
    users: { total: totalUsers, newWeek: newUsersWeek, newMonth: newUsersMonth, pro: proUsers },
    items: { total: totalItems, recentByType },
    todos: { total: totalTodos },
    chatSessions: { total: totalChatSessions },
    dailySignups,
    recentUsers,
  })
}
