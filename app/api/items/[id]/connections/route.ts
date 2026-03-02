import { getUser } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const { data: connections } = await supabase
      .from("item_connections")
      .select("target_id, similarity, ai_reason")
      .eq("source_id", id)
      .order("similarity", { ascending: false })
      .limit(5)

    if (!connections || connections.length === 0) {
      return NextResponse.json({ connections: [] })
    }

    const targetIds = connections.map((c) => c.target_id)
    const { data: items } = await supabase
      .from("items")
      .select("id, content, summary, type, created_at")
      .in("id", targetIds)

    const itemMap = new Map((items || []).map((i) => [i.id, i]))
    const result = connections
      .map((c) => {
        const item = itemMap.get(c.target_id)
        if (!item) return null
        return { ...item, similarity: c.similarity }
      })
      .filter(Boolean)

    return NextResponse.json({ connections: result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
