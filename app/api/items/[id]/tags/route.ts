import { getUser } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { validate } from "@/lib/validations"

const addTagSchema = z.object({
  name: z.string().min(1).max(100).transform((s) => s.trim().toLowerCase()),
})

const removeTagSchema = z.object({
  tag_id: z.string().uuid(),
})

// POST: Add a tag to an item (create tag if not exists)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const raw = await req.json()
  const parsed = validate(addTagSchema, raw)
  if (!parsed.success) return parsed.error
  const { name } = parsed.data

  // Verify item belongs to user
  const { data: item } = await supabase
    .from("items")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 })

  // Find or create tag
  let { data: tag } = await supabase
    .from("tags")
    .select("*")
    .eq("user_id", user.id)
    .eq("name", name)
    .single()

  if (!tag) {
    const { data: newTag, error } = await supabase
      .from("tags")
      .insert({ name, user_id: user.id })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    tag = newTag
  }

  // Link tag to item (upsert to avoid duplicates)
  await supabase
    .from("item_tags")
    .upsert({ item_id: id, tag_id: tag.id }, { onConflict: "item_id,tag_id" })

  return NextResponse.json(tag)
}

// DELETE: Remove a tag from an item
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const raw = await req.json()
  const parsed = validate(removeTagSchema, raw)
  if (!parsed.success) return parsed.error
  const { tag_id } = parsed.data

  // Verify item belongs to user
  const { data: item } = await supabase
    .from("items")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 })

  const { error } = await supabase
    .from("item_tags")
    .delete()
    .eq("item_id", id)
    .eq("tag_id", tag_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
