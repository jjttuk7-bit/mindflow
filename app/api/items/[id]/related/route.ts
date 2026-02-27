import { getUser } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

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

  // Find similar items using pgvector
  const { data, error } = await supabase.rpc("match_items", {
    query_embedding: item.embedding,
    match_threshold: 0.5,
    match_count: 4,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Filter out the current item
  const related = (data || []).filter(
    (r: { id: string }) => r.id !== id
  ).slice(0, 3)

  return NextResponse.json(related)
}
