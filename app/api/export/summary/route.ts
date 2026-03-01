import { getUser } from "@/lib/supabase/server"
import { checkUsageLimit } from "@/lib/plans"
import { validate, exportSummarySchema } from "@/lib/validations"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { NextRequest, NextResponse } from "next/server"

let _genAI: GoogleGenerativeAI | null = null
function getGenAI() {
  if (!_genAI) {
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  }
  return _genAI
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check usage limit
    const usage = await checkUsageLimit(
      user.id,
      "ai_export_per_month",
      "insight_reports",
      "month"
    )
    if (!usage.allowed) {
      return NextResponse.json(
        { error: "Monthly AI export limit reached", used: usage.used, limit: usage.limit },
        { status: 429 }
      )
    }

    const raw = await req.json()
    const parsed = validate(exportSummarySchema, raw)
    if (!parsed.success) return parsed.error
    const { item_ids, project_id, tag, depth } = parsed.data

    // Build query to fetch items
    let query = supabase
      .from("items")
      .select("*, item_tags(tag_id, tags(*))")
      .order("created_at", { ascending: false })

    if (item_ids && item_ids.length > 0) {
      query = query.in("id", item_ids)
    } else if (project_id) {
      query = query.eq("project_id", project_id)
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Flatten tags
    let items = (data || []).map((item: Record<string, unknown>) => ({
      ...item,
      tags:
        (item.item_tags as Array<{ tags: unknown }>)
          ?.map((it) => it.tags)
          .filter(Boolean) || [],
      item_tags: undefined,
    }))

    // Filter by tag if specified
    if (tag) {
      items = items.filter((item: Record<string, unknown>) =>
        (item.tags as Array<{ name: string }>)?.some((t) => t.name === tag)
      )
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "No items found matching the criteria" },
        { status: 404 }
      )
    }

    // Build content string from items
    const contentLines = items.map((item: Record<string, unknown>) => {
      const type = item.type as string
      const summary = item.summary as string | null
      const content = item.content as string
      return `[${type}] ${summary || content}`
    })
    const contentString = contentLines.join("\n")

    // Call Gemini to organize and summarize
    const model = getGenAI().getGenerativeModel({ model: "gemini-2.0-flash" })

    const depthInstruction =
      depth === "brief"
        ? "Create a concise bullet-point summary. Group related items together under topic headings. Keep it scannable and brief."
        : "Create a structured document with clear sections, headings, and paragraphs. Group related items by topic. Include details and context. Add a brief introduction and conclusion."

    const prompt = `You are a knowledge organizer. Given the following captured items from a personal knowledge manager, organize and summarize them into a clean Markdown document.

${depthInstruction}

IMPORTANT: Write the summary in the SAME LANGUAGE as the content. If the content is in Korean, write in Korean. If in English, write in English.

Items (${items.length} total):
${contentString}`

    const result = await model.generateContent(prompt)
    const markdown = result.response.text().trim()

    return NextResponse.json({ markdown, item_count: items.length })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("AI summary export error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
