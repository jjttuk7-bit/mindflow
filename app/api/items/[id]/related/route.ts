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

  // Find similar items using pgvector (excludes current item + deleted items)
  const { data, error } = await supabase.rpc("find_similar_items", {
    query_embedding: item.embedding,
    query_item_id: id,
    match_threshold: SIMILARITY_THRESHOLDS.RELATED,
    match_count: 3,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data || [])
}
