import { getUser } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { SIMILARITY_THRESHOLDS } from "@/lib/constants"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Get the item's embedding
  const { data: item } = await supabase
    .from("items")
    .select("embedding")
    .eq("id", id)
    .single()

  if (!item?.embedding) {
    return NextResponse.json([])
  }

  // Find similar items using pgvector (high relevance only)
  const { data, error } = await supabase.rpc("match_items", {
    query_embedding: item.embedding,
    match_threshold: SIMILARITY_THRESHOLDS.RELATED,
    match_count: 4,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Filter out the current item and deleted items
  const filteredIds = (data || [])
    .filter((r: { id: string }) => r.id !== id)
    .map((r: { id: string }) => r.id)

  if (filteredIds.length === 0) return NextResponse.json([])

  // Check which items are not deleted
  const { data: activeItems } = await supabase
    .from("items")
    .select("id")
    .in("id", filteredIds)
    .is("deleted_at", null)

  const activeIds = new Set((activeItems || []).map((i: { id: string }) => i.id))
  const related = (data || [])
    .filter((r: { id: string }) => r.id !== id && activeIds.has(r.id))
    .slice(0, 3)

  return NextResponse.json(related)
}
