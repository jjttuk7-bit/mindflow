import { getUser } from "@/lib/supabase/server"
import { generateTags, generateSummary, generateEmbedding, generateInsight, generateLinkAnalysis } from "@/lib/ai"
import { validate, itemCreateSchema } from "@/lib/validations"
import { NextRequest, NextResponse } from "next/server"
import { after } from "next/server"
import { createClient } from "@supabase/supabase-js"
import ogs from "open-graph-scraper"

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function scrapeOg(url: string) {
  try {
    const { result } = await ogs({ url, timeout: 8000 })
    const ogImage =
      result.ogImage && result.ogImage.length > 0
        ? result.ogImage[0].url
        : undefined
    return {
      og_title: result.ogTitle || undefined,
      og_description: result.ogDescription || undefined,
      og_image: ogImage,
      og_url: result.ogUrl || url,
      og_domain: new URL(url).hostname.replace("www.", ""),
    }
  } catch {
    return {
      og_url: url,
      og_domain: new URL(url).hostname.replace("www.", ""),
    }
  }
}

export async function POST(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const raw = await req.json()
  const parsed = validate(itemCreateSchema, raw)
  if (!parsed.success) return parsed.error
  const { type, content, metadata } = parsed.data

  // For links, scrape OG metadata
  let meta = metadata
  if (type === "link" && content) {
    const ogData = await scrapeOg(content)
    meta = { ...metadata, ...ogData }
  }

  const { data: item, error } = await supabase
    .from("items")
    .insert({ type, content, metadata: meta, user_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Enrich content for better tagging based on type
  let tagContent = content
  if (type === "link" && meta) {
    const m = meta as Record<string, string>
    const parts = [m.og_title, m.og_description, content].filter(Boolean)
    tagContent = parts.join(" — ")
  } else if (type === "image" && meta && typeof meta === "object" && "screenshot" in meta) {
    const sm = meta as Record<string, unknown>
    const screenshot = sm.screenshot as Record<string, unknown> | undefined
    if (screenshot) {
      const parts = [content]
      if (screenshot.key_info && Array.isArray(screenshot.key_info)) {
        parts.push(...(screenshot.key_info as string[]))
      }
      if (screenshot.todos && Array.isArray(screenshot.todos)) {
        parts.push(...(screenshot.todos as string[]))
      }
      tagContent = parts.filter(Boolean).join(" — ")
    }
  }

  // Run AI enrichment directly in after() — no HTTP round-trip needed
  const itemId = item.id
  const itemType = type
  const userId = user.id

  after(async () => {
    try {
      // Use service role client — user-scoped client loses auth after response
      const supa = getServiceSupabase()

      // Get existing tags for reuse
      const { data: userTagRows } = await supa
        .from("item_tags")
        .select("tag_id, tags(name), items!inner(user_id)")
        .eq("items.user_id", userId)

      const tagFreqMap = new Map<string, number>()
      for (const row of userTagRows || []) {
        const name = (row.tags as unknown as { name: string })?.name
        if (name) tagFreqMap.set(name, (tagFreqMap.get(name) || 0) + 1)
      }
      const tagNamesWithFreq = [...tagFreqMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => `${name} (${count})`)
      const tagNames = [...tagFreqMap.keys()]

      // Run AI tasks in parallel — use allSettled so one failure doesn't block others
      const results = await Promise.allSettled([
        generateTags(tagContent, itemType, tagNames, tagNamesWithFreq),
        generateSummary(tagContent),
        generateEmbedding(tagContent),
        generateInsight(tagContent, itemType),
      ])
      const suggestedTags = results[0].status === "fulfilled" ? results[0].value : []
      const summary = results[1].status === "fulfilled" ? results[1].value : null
      const embedding = results[2].status === "fulfilled" ? results[2].value : null
      const insight = results[3].status === "fulfilled" ? results[3].value : null

      results.forEach((r, i) => {
        if (r.status === "rejected") {
          const names = ["generateTags", "generateSummary", "generateEmbedding", "generateInsight"]
          console.error(`AI enrichment: ${names[i]} failed:`, r.reason)
        }
      })

      // Generate link analysis separately for link type
      let linkAnalysis: string | null = null
      if (itemType === "link") {
        const ogTitle = (meta as Record<string, string>)?.og_title
        const ogDesc = (meta as Record<string, string>)?.og_description
        linkAnalysis = await generateLinkAnalysis(tagContent, ogTitle, ogDesc).catch(() => null)
      }

      // Upsert tags and create relations
      for (const tagName of suggestedTags) {
        const { data: tag } = await supa
          .from("tags")
          .upsert({ name: tagName }, { onConflict: "name" })
          .select()
          .single()

        if (tag) {
          await supa
            .from("item_tags")
            .upsert(
              { item_id: itemId, tag_id: tag.id },
              { onConflict: "item_id,tag_id" }
            )
        }
      }

      // Build update payload
      const updates: Record<string, unknown> = {}
      if (summary) updates.summary = summary
      if (embedding) updates.embedding = JSON.stringify(embedding)

      const now = new Date()
      const hour = now.getHours()
      const timeOfDay =
        hour < 6 ? "night" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
      updates.context = {
        source: "web",
        time_of_day: timeOfDay,
        day_of_week: days[now.getDay()],
        ...(insight ? { ai_comment: insight } : {}),
        ...(linkAnalysis ? { link_analysis: linkAnalysis } : {}),
      }

      if (Object.keys(updates).length > 0) {
        await supa.from("items").update(updates).eq("id", itemId)
      }

      // Trigger auto-connect (fire-and-forget within after is OK)
      if (embedding) {
        const { data: similar } = await supa.rpc("find_similar_items", {
          query_embedding: JSON.stringify(embedding),
          query_item_id: itemId,
          match_threshold: 0.55,
          match_count: 5,
        })

        if (similar && similar.length > 0) {
          const connections = similar.map((s: { id: string; similarity: number }) => ({
            source_id: itemId,
            target_id: s.id,
            similarity: s.similarity,
          }))
          await supa
            .from("item_connections")
            .upsert(connections, { onConflict: "source_id,target_id" })
        }
      }
    } catch (e) {
      console.error("AI enrichment failed:", e)
    }
  })

  return NextResponse.json(item, { status: 201 })
}

export async function GET(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const type = searchParams.get("type")
  const projectId = searchParams.get("project_id")
  const trash = searchParams.get("trash")
  const limit = parseInt(searchParams.get("limit") || "50")
  const offset = parseInt(searchParams.get("offset") || "0")

  let query = supabase
    .from("items")
    .select("*, item_tags(tag_id, tags(*))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  // Trash filter: show only trashed or only non-trashed items
  if (trash === "true") {
    query = query.not("deleted_at", "is", null)
  } else {
    query = query.is("deleted_at", null)
  }

  if (type && type !== "all") {
    query = query.eq("type", type)
  }

  if (projectId) {
    query = query.eq("project_id", projectId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Flatten tags
  const items = (data || []).map((item: Record<string, unknown>) => ({
    ...item,
    tags:
      (item.item_tags as Array<{ tags: unknown }>)
        ?.map((it) => it.tags)
        .filter(Boolean) || [],
    item_tags: undefined,
  }))

  return NextResponse.json(items)
}
