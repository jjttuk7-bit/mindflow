import { getUser } from "@/lib/supabase/server"
import { validate } from "@/lib/validations"
import { dealUpdateSchema } from "@/lib/sales-validations"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const raw = await req.json()
  const parsed = validate(dealUpdateSchema, raw)
  if (!parsed.success) return parsed.error

  const updates = { ...parsed.data } as Record<string, unknown>

  // Auto-set closed_at when stage changes to closed
  if (parsed.data.stage === "closed_won" || parsed.data.stage === "closed_lost") {
    if (!updates.closed_at) updates.closed_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from("deals")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { error } = await supabase.from("deals").delete().eq("id", id).eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
