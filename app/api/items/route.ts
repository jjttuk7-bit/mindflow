import { getUser } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import ogs from "open-graph-scraper"

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

  const body = await req.json()
  const { type, content, metadata = {} } = body

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

  // Trigger async AI tagging (fire and forget) — forward cookies for auth
  const cookieHeader = req.headers.get("cookie") || ""
  fetch(`${req.nextUrl.origin}/api/ai/tag`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: cookieHeader,
    },
    body: JSON.stringify({ item_id: item.id, content, type }),
  }).catch(() => {})

  return NextResponse.json(item, { status: 201 })
}

export async function GET(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const type = searchParams.get("type")
  const limit = parseInt(searchParams.get("limit") || "50")
  const offset = parseInt(searchParams.get("offset") || "0")

  let query = supabase
    .from("items")
    .select("*, item_tags(tag_id, tags(*))")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (type && type !== "all") {
    query = query.eq("type", type)
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
