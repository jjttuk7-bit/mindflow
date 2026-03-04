import { getUser } from "@/lib/supabase/server"
import { classifyProject, extractTodos } from "@/lib/ai"
import { enrichItem } from "@/lib/ai-enrichment"
import { getUserPlan, PLAN_LIMITS } from "@/lib/plans"
import { logger, withLogging } from "@/lib/logger"
import { rateLimit } from "@/lib/rate-limit"
import { validate, aiTagSchema } from "@/lib/validations"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { maxRequests: 20, windowMs: 60_000 })
  if (limited) return limited

  try {
    const { supabase, user } = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const log = withLogging("/api/ai/tag").start(user.id)
    const raw = await req.json()
    const parsed = validate(aiTagSchema, raw)
    if (!parsed.success) return parsed.error
    const { item_id, content, type } = parsed.data

    // Shared AI enrichment (tags, summary, embedding, insight, link analysis, batch upsert)
    const result = await enrichItem(item_id, content, type, user.id, supabase, {
      source: "web",
    })

    // Pro features: project classification + TODO extraction
    const plan = await getUserPlan(user.id)
    const limits = PLAN_LIMITS[plan]

    if (limits.ai_project_classification) {
      try {
        const { data: existingProjects } = await supabase
          .from("projects")
          .select("id, name")
          .eq("user_id", user.id)

        const projectsWithContext = await Promise.all(
          (existingProjects || []).map(async (p) => {
            const { data: recentItems } = await supabase
              .from("items")
              .select("content, summary")
              .eq("project_id", p.id)
              .order("created_at", { ascending: false })
              .limit(3)
            const samples = (recentItems || [])
              .map((i) => i.summary || i.content.slice(0, 80))
            return { id: p.id, name: p.name, samples }
          })
        )

        const classification = await classifyProject(content, type, projectsWithContext)

        if (classification.action === "existing") {
          await supabase.from("items").update({ project_id: classification.project_id }).eq("id", item_id)
        } else if (classification.action === "new") {
          const { data: newProject } = await supabase
            .from("projects")
            .insert({
              name: classification.name,
              color: "#8B7355",
              is_auto: true,
              user_id: user.id,
            })
            .select()
            .single()
          if (newProject) {
            await supabase.from("items").update({ project_id: newProject.id }).eq("id", item_id)
          }
        }
      } catch (err) {
        console.error("Project classification error:", err)
      }
    }

    if (limits.todo_auto_extract) {
      try {
        const todos = await extractTodos(content)
        if (todos.length > 0) {
          const todoRows = todos.map((todo) => ({
            content: todo,
            user_id: user.id,
            item_id,
          }))
          await supabase.from("todos").insert(todoRows)
        }
      } catch (err) {
        console.error("TODO extraction error:", err)
      }
    }

    // Trigger auto-connect
    fetch(`${req.nextUrl.origin}/api/ai/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") || "",
      },
      body: JSON.stringify({ item_id }),
    }).catch(() => {})

    log.success({ tags: result.tags.length })
    return NextResponse.json({
      tags: result.tags,
      summary: result.summary,
      ...(result.errors.length > 0 ? { _errors: result.errors } : {}),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error("/api/ai/tag failed", { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
