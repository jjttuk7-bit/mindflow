import { getUser } from "@/lib/supabase/server"
import { validate, projectUpdateSchema } from "@/lib/validations"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const raw = await req.json()
  const parsed = validate(projectUpdateSchema, raw)
  if (!parsed.success) return parsed.error
  const allowed: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() }

  const { data, error } = await supabase
    .from("projects")
    .update(allowed)
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

  // Unlink items first
  await supabase
    .from("items")
    .update({ project_id: null })
    .eq("project_id", id)

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
