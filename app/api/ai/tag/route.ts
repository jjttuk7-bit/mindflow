import { getUser } from "@/lib/supabase/server"
import { generateTags, generateSummary, generateEmbedding } from "@/lib/ai"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { item_id, content, type } = await req.json()

    // Get existing tags for reuse
    const { data: existingTags } = await supabase.from("tags").select("name")
    const tagNames = existingTags?.map((t) => t.name) || []

    // Run AI tasks in parallel: tags + summary + embedding
    const [suggestedTags, summary, embedding] = await Promise.all([
      generateTags(content, type, tagNames),
      generateSummary(content),
      generateEmbedding(content),
    ])

    // Upsert tags and create relations
    for (const tagName of suggestedTags) {
      const { data: tag } = await supabase
        .from("tags")
        .upsert({ name: tagName }, { onConflict: "name" })
        .select()
        .single()

      if (tag) {
        await supabase
          .from("item_tags")
          .upsert(
            { item_id, tag_id: tag.id },
            { onConflict: "item_id,tag_id" }
          )
      }
    }

    // Update item with summary and embedding
    const updates: Record<string, unknown> = {}
    if (summary) updates.summary = summary
    if (embedding) updates.embedding = JSON.stringify(embedding)

    if (Object.keys(updates).length > 0) {
      await supabase.from("items").update(updates).eq("id", item_id)
    }

    return NextResponse.json({ tags: suggestedTags, summary })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("AI tag error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
