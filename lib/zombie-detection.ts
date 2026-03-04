import { SupabaseClient } from "@supabase/supabase-js"
import { ZOMBIE_THRESHOLDS } from "./constants"

export interface ZombieCounts {
  links: number
  todos: number
  pins: number
  total: number
}

export async function detectZombieItems(
  supabase: SupabaseClient,
  userId: string,
  referenceDate?: Date
): Promise<ZombieCounts> {
  const now = referenceDate ?? new Date()

  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - ZOMBIE_THRESHOLDS.LINK_DAYS)

  const fourteenDaysAgo = new Date(now)
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - ZOMBIE_THRESHOLDS.TODO_DAYS)

  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - ZOMBIE_THRESHOLDS.LINK_UNTOUCHED_DAYS)

  const [linksResult, todosResult, pinsResult] = await Promise.all([
    // Zombie links: unarchived links older than 30 days, not touched in 7 days
    supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "link")
      .eq("is_archived", false)
      .is("deleted_at", null)
      .lte("created_at", thirtyDaysAgo.toISOString())
      .lte("updated_at", sevenDaysAgo.toISOString()),

    // Zombie todos: incomplete todos older than 14 days
    supabase
      .from("todos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_completed", false)
      .lte("created_at", fourteenDaysAgo.toISOString()),

    // Zombie pins: pinned items older than 30 days
    supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_pinned", true)
      .is("deleted_at", null)
      .lte("created_at", thirtyDaysAgo.toISOString()),
  ])

  const links = linksResult.count || 0
  const todos = todosResult.count || 0
  const pins = pinsResult.count || 0

  return { links, todos, pins, total: links + todos + pins }
}

export async function fetchStaleItems(
  supabase: SupabaseClient,
  userId: string,
  limit = ZOMBIE_THRESHOLDS.CLEANUP_FETCH_LIMIT
) {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - ZOMBIE_THRESHOLDS.LINK_DAYS)

  const { data } = await supabase
    .from("items")
    .select("id, type, content, summary, created_at")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .is("deleted_at", null)
    .in("type", ["link", "image", "text"])
    .lte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: true })
    .limit(limit)

  return data || []
}
