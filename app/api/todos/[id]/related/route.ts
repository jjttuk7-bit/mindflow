import { getUser } from "@/lib/supabase/server"
import { generateEmbedding } from "@/lib/ai"
import { NextRequest, NextResponse } from "next/server"
import { SIMILARITY_THRESHOLDS } from "@/lib/constants"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { supabase, user } = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Get the todo content
    const { data: todo, error: todoError } = await supabase
      .from("todos")
      .select("content")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (todoError || !todo) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 })
    }

    // Generate embedding from todo content
    const embedding = await generateEmbedding(todo.content)

    // Find related items using semantic search
    const { data: matches, error } = await supabase.rpc("match_items", {
      query_embedding: JSON.stringify(embedding),
      match_threshold: SIMILARITY_THRESHOLDS.RESURFACE,
      match_count: 5,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const related = (matches || []).slice(0, 3).map((m: { id: string; content: string; summary?: string; type: string; similarity: number; created_at: string }) => ({
      id: m.id,
      type: m.type,
      content: m.summary || m.content?.slice(0, 100),
      similarity: m.similarity,
      created_at: m.created_at,
    }))

    return NextResponse.json(related)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Todo related error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
