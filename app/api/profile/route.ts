import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()

  // Get all shared item IDs
  const { data: shared, error: shareError } = await supabase
    .from("shared_items")
    .select("item_id")

  if (shareError || !shared || shared.length === 0) {
    return NextResponse.json([])
  }

  const itemIds = shared.map((s) => s.item_id)

  // Get full items with tags
  const { data: items, error } = await supabase
    .from("items")
    .select("*, tags:item_tags(tag:tags(*))")
    .in("id", itemIds)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Flatten tags
  const result = (items || []).map((item) => ({
    ...item,
    tags: (item.tags as { tag: { id: string; name: string } }[])?.map(
      (t) => t.tag
    ) ?? [],
  }))

  return NextResponse.json(result)
}
