import { getUser } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const { supabase, user } = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    // Links that have never been accessed and are older than 3 days
    const { data, error } = await supabase
      .from("items")
      .select("id, content, summary, metadata, created_at")
      .eq("user_id", user.id)
      .eq("type", "link")
      .is("last_accessed_at", null)
      .is("deleted_at", null)
      .eq("is_archived", false)
      .lt("created_at", threeDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(5)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const links = (data || []).map((item) => {
      const meta = item.metadata as Record<string, string> | null
      const daysAgo = Math.floor(
        (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24)
      )
      return {
        id: item.id,
        url: item.content,
        title: meta?.og_title || item.summary || item.content,
        domain: meta?.og_domain,
        days_ago: daysAgo,
      }
    })

    return NextResponse.json({ links, count: links.length })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Unread links error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
