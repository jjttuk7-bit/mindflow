import { getUser } from "@/lib/supabase/server"
import { validate, itemUpdateSchema } from "@/lib/validations"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("items")
    .select("*, item_tags(tag_id, tags(*))")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  const tags = (data.item_tags as Array<{ tags: unknown }>)
    ?.map((it) => it.tags)
    .filter(Boolean) || []

  return NextResponse.json({ ...data, tags, item_tags: undefined })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const raw = await req.json()
  const parsed = validate(itemUpdateSchema, raw)
  if (!parsed.success) return parsed.error

  const { data, error } = await supabase
    .from("items")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const permanent = req.nextUrl.searchParams.get("permanent") === "true"

  if (permanent) {
    // Permanent delete: hard delete + storage cleanup
    const { data: item } = await supabase
      .from("items")
      .select("metadata, type")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    const { error } = await supabase.from("items").delete().eq("id", id).eq("user_id", user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Clean up storage files (fire and forget)
    if (item?.metadata) {
      const meta = item.metadata as Record<string, string>
      try {
        if (meta.image_url) {
          const path = extractStoragePath(meta.image_url, "items-images")
          if (path) await getSupabaseAdmin().storage.from("items-images").remove([path])
        }
        if (meta.file_url) {
          const path = extractStoragePath(meta.file_url, "items-audio")
          if (path) await getSupabaseAdmin().storage.from("items-audio").remove([path])
        }
      } catch {
        // Storage cleanup is best-effort
      }
    }

    return NextResponse.json({ success: true })
  }

  // Soft delete: move to trash by setting deleted_at
  const { data, error } = await supabase
    .from("items")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

function extractStoragePath(url: string, bucket: string): string | null {
  try {
    const marker = `/storage/v1/object/public/${bucket}/`
    const idx = url.indexOf(marker)
    if (idx === -1) return null
    return decodeURIComponent(url.slice(idx + marker.length))
  } catch {
    return null
  }
}
