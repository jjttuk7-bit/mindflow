import { createClient } from "@/lib/supabase/server"

export const PLAN_LIMITS = {
  free: {
    telegram_captures_per_month: 30,
    semantic_search_per_day: 5,
    projects: 3,
    smart_folders: 2,
    ai_export_per_month: 3,
    ai_chat_per_day: 5,
    todo_auto_extract: false,
    ai_project_classification: false,
    insight_ai_analysis: false,
    telegram_notifications: false,
    ai_profile: false,
    ai_nudges: 2,
    ai_connections_per_day: 5,
  },
  pro: {
    telegram_captures_per_month: Infinity,
    semantic_search_per_day: Infinity,
    projects: Infinity,
    smart_folders: Infinity,
    ai_export_per_month: Infinity,
    ai_chat_per_day: Infinity,
    todo_auto_extract: true,
    ai_project_classification: true,
    insight_ai_analysis: true,
    telegram_notifications: true,
    ai_profile: true,
    ai_nudges: Infinity,
    ai_connections_per_day: Infinity,
  },
} as const

export type PlanType = keyof typeof PLAN_LIMITS

export async function getUserPlan(userId: string): Promise<PlanType> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("user_settings")
    .select("plan")
    .eq("user_id", userId)
    .single()
  return (data?.plan as PlanType) || "free"
}

export async function checkUsageLimit(
  userId: string,
  feature: string,
  table: string,
  dateFilter: "day" | "month"
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const plan = await getUserPlan(userId)
  const limit = PLAN_LIMITS[plan][feature as keyof (typeof PLAN_LIMITS)["free"]] as number

  if (limit === Infinity) return { allowed: true, used: 0, limit }

  const supabase = await createClient()
  const now = new Date()
  let startDate: string

  if (dateFilter === "day") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  }

  const { count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startDate)

  const used = count || 0
  return { allowed: used < limit, used, limit }
}
