import { getUser } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("tags")
    .select("*, item_tags!inner(item_id, items!inner(user_id))")
    .eq("item_tags.items.user_id", user.id)
    .order("name")

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Deduplicate and count
  const countMap = new Map<string, number>()
  const tagMap = new Map<string, Record<string, unknown>>()

  for (const tag of data || []) {
    const { item_tags, ...rest } = tag
    if (!tagMap.has(tag.id)) {
      tagMap.set(tag.id, rest)
      countMap.set(tag.id, 0)
    }
    countMap.set(tag.id, (countMap.get(tag.id) ?? 0) + (item_tags?.length ?? 1))
  }

  const uniqueTags = Array.from(tagMap.values()).map((tag) => ({
    ...tag,
    item_count: countMap.get(tag.id as string) ?? 0,
  }))

  return NextResponse.json(uniqueTags)
}
