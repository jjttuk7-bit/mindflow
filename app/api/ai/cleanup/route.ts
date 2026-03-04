import { getUser } from "@/lib/supabase/server"
import { getOpenAI, MODEL_MAP } from "@/lib/ai"
import { NextResponse } from "next/server"
import { fetchStaleItems } from "@/lib/zombie-detection"

export async function GET() {
  try {
    const { supabase, user } = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Fetch stale items using shared utility
    const staleItems = await fetchStaleItems(supabase, user.id)

    if (staleItems.length === 0) {
      return NextResponse.json({
        items: [],
        summary: "정리할 항목이 없어요! 깔끔하게 관리하고 계시네요.",
      })
    }

    // Build item descriptions for AI
    const itemDescriptions = staleItems.map((item) => ({
      id: item.id,
      type: item.type,
      preview: item.summary || item.content?.slice(0, 120) || "",
      age_days: Math.floor(
        (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24)
      ),
    }))

    const prompt = `You are a knowledge management assistant. Analyze these stale items and recommend actions.

Items:
${itemDescriptions.map((i) => `- [${i.id}] (${i.type}, ${i.age_days}일 전) ${i.preview}`).join("\n")}

For each item, recommend one action: "archive" (already consumed/outdated), "delete" (low value/duplicate), or "revisit" (still valuable, worth reading).

Return ONLY valid JSON:
{
  "items": [
    {
      "id": "item-id-here",
      "action": "archive",
      "reason": "Brief reason in Korean"
    }
  ],
  "summary": "Overall summary in Korean, e.g. '12개 항목 중 5개 아카이브, 3개 삭제, 4개 재방문을 추천해요'"
}`

    const result = await getOpenAI().chat.completions.create({
      model: MODEL_MAP.analysis,
      messages: [{ role: "user", content: prompt }],
    })

    const text = result.choices[0].message.content?.trim() || ""

    let parsed: {
      items: Array<{ id: string; action: string; reason: string }>
      summary: string
    }

    try {
      parsed = JSON.parse(text)
    } catch {
      const match = text.match(/[\[{][\s\S]*[\]}]/)
      if (match) {
        try {
          parsed = JSON.parse(match[0])
        } catch {
          parsed = { items: [], summary: "AI 응답을 처리할 수 없었어요" }
        }
      } else {
        parsed = { items: [], summary: "AI 응답을 처리할 수 없었어요" }
      }
    }

    // Merge AI recommendations with item data
    const enrichedItems = parsed.items.map((rec) => {
      const original = staleItems.find((i) => i.id === rec.id)
      return {
        id: rec.id,
        type: original?.type || "text",
        preview: original?.summary || original?.content?.slice(0, 80) || "",
        action: rec.action as "archive" | "delete" | "revisit",
        reason: rec.reason,
      }
    })

    return NextResponse.json({
      items: enrichedItems,
      summary: parsed.summary,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Cleanup API error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
