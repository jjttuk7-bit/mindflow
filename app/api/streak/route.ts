import { getUser } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data } = await supabase
    .from("user_streaks")
    .select("current_streak, longest_streak, last_active_date")
    .eq("user_id", user.id)
    .single()

  return NextResponse.json(data || { current_streak: 0, longest_streak: 0, last_active_date: null })
}

export async function POST() {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const today = new Date().toISOString().split("T")[0]

  // Get existing streak
  const { data: existing } = await supabase
    .from("user_streaks")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!existing) {
    // First check-in ever
    const { data, error } = await supabase
      .from("user_streaks")
      .insert({
        user_id: user.id,
        current_streak: 1,
        longest_streak: 1,
        last_active_date: today,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  }

  // Already checked in today
  if (existing.last_active_date === today) {
    return NextResponse.json(existing)
  }

  // Calculate streak
  const lastDate = existing.last_active_date ? new Date(existing.last_active_date) : null
  const todayDate = new Date(today)
  let newStreak = 1

  if (lastDate) {
    const diffMs = todayDate.getTime() - lastDate.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      // Consecutive day
      newStreak = existing.current_streak + 1
    }
    // diffDays > 1 means streak broken, reset to 1
  }

  const newLongest = Math.max(existing.longest_streak, newStreak)

  const { data, error } = await supabase
    .from("user_streaks")
    .update({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_active_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
