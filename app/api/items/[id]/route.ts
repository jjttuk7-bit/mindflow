import { getUser } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()

  const { data, error } = await supabase
    .from("items")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Fetch item to get storage file paths before deleting
  const { data: item } = await supabase
    .from("items")
    .select("metadata, type")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  // Delete from database
  const { error } = await supabase.from("items").delete().eq("id", id).eq("user_id", user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Clean up storage files (fire and forget)
  if (item?.metadata) {
    const meta = item.metadata as Record<string, string>
    try {
      if (meta.image_url) {
        const path = extractStoragePath(meta.image_url, "items-images")
        if (path) await supabaseAdmin.storage.from("items-images").remove([path])
      }
      if (meta.file_url) {
        const path = extractStoragePath(meta.file_url, "items-audio")
        if (path) await supabaseAdmin.storage.from("items-audio").remove([path])
      }
    } catch {
      // Storage cleanup is best-effort
    }
  }

  return NextResponse.json({ success: true })
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
