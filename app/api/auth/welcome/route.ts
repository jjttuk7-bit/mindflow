import { getUser } from "@/lib/supabase/server"
import { sendWelcomeEmail } from "@/lib/email"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const { user } = await getUser()
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Only send for users created within last 5 minutes
    const createdAt = new Date(user.created_at).getTime()
    if (Date.now() - createdAt > 5 * 60_000) {
      return NextResponse.json({ skipped: true })
    }

    await sendWelcomeEmail(user.email)
    return NextResponse.json({ sent: true })
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
