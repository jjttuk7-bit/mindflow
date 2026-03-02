import { getUser } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { item_id } = await req.json()
    if (!item_id) return NextResponse.json({ error: "item_id required" }, { status: 400 })

    // Get the item's embedding
    const { data: item } = await supabase
      .from("items")
      .select("id, embedding")
      .eq("id", item_id)
      .single()

    if (!item?.embedding) {
      return NextResponse.json({ connections: [] })
    }

    // Find similar items via RPC
    const { data: similar } = await supabase.rpc("find_similar_items", {
      query_embedding: item.embedding,
      query_item_id: item_id,
      match_threshold: 0.35,
      match_count: 5,
    })

    if (!similar || similar.length === 0) {
      return NextResponse.json({ connections: [] })
    }

    // Save connections (upsert)
    const connections = similar.map((s: { id: string; similarity: number }) => ({
      source_id: item_id,
      target_id: s.id,
      similarity: s.similarity,
    }))

    await supabase
      .from("item_connections")
      .upsert(connections, { onConflict: "source_id,target_id" })

    // Create nudge for high-similarity connections
    const topMatch = similar[0]
    if (topMatch && topMatch.similarity > 0.5) {
      const matchTitle = topMatch.summary || topMatch.content?.slice(0, 40)
      await supabase.from("nudges").insert({
        user_id: user.id,
        type: "connection",
        title: "관련 항목을 발견했어요",
        content: `방금 저장한 항목이 "${matchTitle}"과(와) 연결됩니다.`,
        related_item_ids: [item_id, topMatch.id],
      })
    }

    return NextResponse.json({ connections: similar })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Auto-connect error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
