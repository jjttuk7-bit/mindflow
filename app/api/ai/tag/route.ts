import { getUser } from "@/lib/supabase/server"
import { generateTags, generateSummary, generateEmbedding, classifyProject, extractTodos } from "@/lib/ai"
import { getUserPlan, PLAN_LIMITS } from "@/lib/plans"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { item_id, content, type } = await req.json()

    // Get existing tags for reuse
    const { data: userTagRows } = await supabase
      .from("item_tags")
      .select("tag_id, tags(name), items!inner(user_id)")
      .eq("items.user_id", user.id)

    // Count frequency per tag
    const tagFreqMap = new Map<string, number>()
    for (const row of userTagRows || []) {
      const name = (row.tags as unknown as { name: string })?.name
      if (name) tagFreqMap.set(name, (tagFreqMap.get(name) || 0) + 1)
    }
    // Sort by frequency descending, format as "tag-name (count)"
    const tagNamesWithFreq = [...tagFreqMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `${name} (${count})`)
    const tagNames = [...tagFreqMap.keys()]

    // Run AI tasks in parallel: tags + summary + embedding
    const [suggestedTags, summary, embedding] = await Promise.all([
      generateTags(content, type, tagNames, tagNamesWithFreq),
      generateSummary(content),
      generateEmbedding(content),
    ])

    // Upsert tags and create relations
    for (const tagName of suggestedTags) {
      const { data: tag } = await supabase
        .from("tags")
        .upsert({ name: tagName }, { onConflict: "name" })
        .select()
        .single()

      if (tag) {
        await supabase
          .from("item_tags")
          .upsert(
            { item_id, tag_id: tag.id },
            { onConflict: "item_id,tag_id" }
          )
      }
    }

    // Update item with summary and embedding
    const updates: Record<string, unknown> = {}
    if (summary) updates.summary = summary
    if (embedding) updates.embedding = JSON.stringify(embedding)

    // Generate context metadata
    const now = new Date()
    const hour = now.getHours()
    const timeOfDay =
      hour < 6 ? "night" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    updates.context = {
      source: "web",
      time_of_day: timeOfDay,
      day_of_week: days[now.getDay()],
    }

    // Pro features: project classification + TODO extraction
    const plan = await getUserPlan(user.id)
    const limits = PLAN_LIMITS[plan]

    if (limits.ai_project_classification) {
      try {
        const { data: existingProjects } = await supabase
          .from("projects")
          .select("id, name")
          .eq("user_id", user.id)

        const classification = await classifyProject(
          content,
          type,
          existingProjects || []
        )

        if (classification.action === "existing") {
          updates.project_id = classification.project_id
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
            updates.project_id = newProject.id
          }
        }
      } catch (err) {
        console.error("Project classification error:", err)
      }
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from("items").update(updates).eq("id", item_id)
    }

    // Pro feature: TODO extraction
    if (limits.todo_auto_extract) {
      try {
        const todos = await extractTodos(content)
        if (todos.length > 0) {
          const todoRows = todos.map((todo) => ({
            content: todo,
            user_id: user.id,
            item_id,
            project_id: (updates.project_id as string) || null,
          }))
          await supabase.from("todos").insert(todoRows)
        }
      } catch (err) {
        console.error("TODO extraction error:", err)
      }
    }

    return NextResponse.json({ tags: suggestedTags, summary })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("AI tag error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
