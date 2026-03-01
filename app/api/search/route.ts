import { getUser } from "@/lib/supabase/server"
import { generateEmbedding } from "@/lib/ai"
import { validate, searchSchema } from "@/lib/validations"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const raw = await req.json()
  const parsed = validate(searchSchema, raw)
  if (!parsed.success) return parsed.error
  const { query, limit } = parsed.data

  if (!query?.trim()) {
    return NextResponse.json([])
  }

  // Generate embedding for the search query
  const embedding = await generateEmbedding(query)

  // Search by cosine similarity using pgvector
  const { data, error } = await supabase.rpc("match_items", {
    query_embedding: JSON.stringify(embedding),
    match_threshold: 0.1,
    match_count: limit,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data || [])
}
