import { getUser } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Only return tags that are associated with the current user's items
  const { data, error } = await supabase
    .from("tags")
    .select("*, item_tags!inner(item_id, items!inner(user_id))")
    .eq("item_tags.items.user_id", user.id)
    .order("name")

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Deduplicate tags (a tag may appear multiple times via different items)
  const seen = new Set<string>()
  const uniqueTags = (data || [])
    .filter((tag) => {
      if (seen.has(tag.id)) return false
      seen.add(tag.id)
      return true
    })
    .map(({ item_tags, ...tag }) => tag)

  return NextResponse.json(uniqueTags)
}
