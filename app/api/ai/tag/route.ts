import { createClient } from "@/lib/supabase/server"
import { generateTags } from "@/lib/ai"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { item_id, content, type } = await req.json()

  // Get existing tags for reuse
  const { data: existingTags } = await supabase.from("tags").select("name")
  const tagNames = existingTags?.map((t) => t.name) || []

  // Generate tags via AI
  const suggestedTags = await generateTags(content, type, tagNames)

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

  return NextResponse.json({ tags: suggestedTags })
}
