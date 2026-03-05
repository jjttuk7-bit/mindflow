import { getUser } from "@/lib/supabase/server"
import { enrichItem, autoConnect } from "@/lib/ai-enrichment"
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

async function fetchNaverShopping(url: string): Promise<{ title?: string; category?: string; price?: string; brand?: string; image?: string } | null> {
  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  try {
    // Extract product name from URL path or query
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split("/").filter(Boolean)
    // Smart Store: /store-name/products/product-id
    const productId = pathParts.find(p => /^\d+$/.test(p))

    // Try to get product info via search using the URL
    const searchQuery = productId || pathParts[pathParts.length - 1] || ""
    if (!searchQuery) return null

    const res = await fetch(
      `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(url)}&display=1`,
      {
        headers: {
          "X-Naver-Client-Id": clientId,
          "X-Naver-Client-Secret": clientSecret,
        },
        signal: AbortSignal.timeout(5000),
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    const item = data.items?.[0]
    if (!item) return null

    return {
      title: item.title?.replace(/<[^>]*>/g, "") || undefined,
      category: [item.category1, item.category2, item.category3, item.category4].filter(Boolean).join(" > ") || undefined,
      price: item.lprice ? `${Number(item.lprice).toLocaleString()}원` : undefined,
      brand: item.brand || item.maker || undefined,
      image: item.image || undefined,
    }
  } catch {
    return null
  }
}

async function fetchOEmbed(url: string): Promise<{ title?: string; author?: string; thumbnail?: string } | null> {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    let oembedUrl = ""
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
      oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    } else {
      return null
    }
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const data = await res.json()
    return {
      title: data.title || undefined,
      author: data.author_name || undefined,
      thumbnail: data.thumbnail_url || undefined,
    }
  } catch {
    return null
  }
}

async function scrapeOg(url: string) {
  const domain = new URL(url).hostname.replace("www.", "")

  try {
    const { result } = await ogs({
      url,
      timeout: 8000,
      fetchOptions: {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        },
      },
    })
    const ogImage =
      result.ogImage && result.ogImage.length > 0
        ? result.ogImage[0].url
        : undefined

    let ogData = {
      og_title: result.ogTitle || undefined,
      og_description: result.ogDescription || undefined,
      og_image: ogImage,
      og_url: result.ogUrl || url,
      og_domain: domain,
    }

    // If OG scraping returned no title, try fallbacks
    if (!ogData.og_title) {
      // Try oEmbed (YouTube etc.)
      const oembed = await fetchOEmbed(url)
      if (oembed) {
        ogData.og_title = oembed.title
        ogData.og_description = ogData.og_description || (oembed.author ? `by ${oembed.author}` : undefined)
        ogData.og_image = ogData.og_image || oembed.thumbnail
      }

      // Try Naver Shopping API for shopping domains
      if (!ogData.og_title || /smartstore\.naver|shopping\.naver/i.test(domain)) {
        const shop = await fetchNaverShopping(url)
        if (shop?.title) {
          ogData.og_title = ogData.og_title || shop.title
          ogData.og_description = [shop.category, shop.price, shop.brand].filter(Boolean).join(" | ")
          ogData.og_image = ogData.og_image || shop.image
        }
      }
    }

    return ogData
  } catch {
    // OG scraping completely failed — try fallbacks
    const oembed = await fetchOEmbed(url)
    if (oembed?.title) {
      return {
        og_title: oembed.title,
        og_description: oembed.author ? `by ${oembed.author}` : undefined,
        og_image: oembed.thumbnail,
        og_url: url,
        og_domain: domain,
      }
    }

    const shop = await fetchNaverShopping(url)
    if (shop?.title) {
      return {
        og_title: shop.title,
        og_description: [shop.category, shop.price, shop.brand].filter(Boolean).join(" | "),
        og_image: shop.image,
        og_url: url,
        og_domain: domain,
      }
    }

    return {
      og_url: url,
      og_domain: domain,
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

  // Run AI enrichment in after() — no HTTP round-trip needed
  const itemId = item.id
  const itemType = type
  const userId = user.id

  after(async () => {
    try {
      const supa = getServiceSupabase()

      const ogTitle = (meta as Record<string, string>)?.og_title
      const ogDesc = (meta as Record<string, string>)?.og_description

      const result = await enrichItem(itemId, tagContent, itemType, userId, supa, {
        ogTitle,
        ogDescription: ogDesc,
        source: "web",
      })

      // Auto-connect based on embedding similarity
      if (result.embedding) {
        await autoConnect(itemId, result.embedding, supa)
      }

      // Extract expiry info from screenshot analysis
      if (itemType === "image") {
        const { data: currentItem } = await supa
          .from("items")
          .select("metadata")
          .eq("id", itemId)
          .single()
        const currentMeta = currentItem?.metadata as Record<string, unknown> | null
        const screenshot = currentMeta?.screenshot as Record<string, unknown> | undefined
        const expiry = screenshot?.expiry as Record<string, unknown> | undefined
        if (expiry?.detected && expiry.expiry_date) {
          await supa
            .from("items")
            .update({
              metadata: {
                ...currentMeta,
                expiry: {
                  expiry_date: expiry.expiry_date as string,
                  expiry_type: (expiry.expiry_type as string) || "other",
                  vendor: (expiry.vendor as string) || undefined,
                  amount: (expiry.amount as string) || undefined,
                  barcode: (expiry.barcode as string) || undefined,
                },
              },
            })
            .eq("id", itemId)
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
