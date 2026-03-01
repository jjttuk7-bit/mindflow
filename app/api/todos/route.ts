import { getUser } from "@/lib/supabase/server"
import { validate, todoCreateSchema } from "@/lib/validations"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const projectId = searchParams.get("project_id")
  const completed = searchParams.get("completed")

  let query = supabase
    .from("todos")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (projectId) {
    query = query.eq("project_id", projectId)
  }

  if (completed === "true") {
    query = query.eq("is_completed", true)
  } else if (completed === "false") {
    query = query.eq("is_completed", false)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const raw = await req.json()
  const parsed = validate(todoCreateSchema, raw)
  if (!parsed.success) return parsed.error
  const { content, project_id, item_id, due_date } = parsed.data

  const { data, error } = await supabase
    .from("todos")
    .insert({
      content,
      project_id: project_id || null,
      item_id: item_id || null,
      due_date: due_date || null,
      user_id: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
