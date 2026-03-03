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
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  // Use admin client to bypass RLS for public shared items
  const { data: shared, error: shareError } = await getSupabaseAdmin()
    .from("shared_items")
    .select("item_id")
    .eq("token", token)
    .single()

  if (shareError || !shared) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Get the full item with tags
  const { data: item, error: itemError } = await getSupabaseAdmin()
    .from("items")
    .select("*, tags:item_tags(tag:tags(*))")
    .eq("id", shared.item_id)
    .single()

  if (itemError || !item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 })
  }

  // Flatten tags
  const tags = (item.tags as { tag: { id: string; name: string } }[])?.map(
    (t) => t.tag
  ) ?? []

  return NextResponse.json({ ...item, tags })
}
