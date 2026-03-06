import { getUser } from "@/lib/supabase/server"
import { enrichItem, autoConnect } from "@/lib/ai-enrichment"
import { validate, itemCreateSchema } from "@/lib/validations"
import { NextRequest, NextResponse } from "next/server"
import { after } from "next/server"
import { createClient } from "@supabase/supabase-js"
import ogs from "open-graph-scraper"

/** Follow redirects to resolve short URLs (naver.me, bit.ly, etc.) */
async function resolveUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      },
    })
    return res.url || url
  } catch {
    // Try GET as fallback (some servers don't support HEAD)
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(5000),
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        },
      })
      return res.url || url
    } catch {
      return url
    }
  }
}

/** Check if URL is a short/redirect URL that needs resolution */
function isShortUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return /^(naver\.me|bit\.ly|t\.co|goo\.gl|tinyurl\.com|url\.kr|vo\.la|han\.gl|me2\.do|hoy\.kr)$/.test(hostname)
  } catch {
    return false
  }
}

/** Extract readable text content from HTML, stripping scripts/styles/nav */
function extractPageText(html: string, maxLen = 1000): string {
  // Remove scripts, styles, nav, header, footer, aside
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<[^>]+>/g, " ")          // strip remaining tags
    .replace(/&[a-z]+;/gi, " ")        // strip HTML entities
    .replace(/\s+/g, " ")             // collapse whitespace
    .trim()

  // Take first maxLen chars, break at word boundary
  if (text.length > maxLen) {
    text = text.slice(0, maxLen)
    const lastSpace = text.lastIndexOf(" ")
    if (lastSpace > maxLen * 0.8) text = text.slice(0, lastSpace)
    text += "…"
  }

  return text
}

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function fetchNaverShopping(url: string, ogTitle?: string): Promise<{ title?: string; category?: string; price?: string; brand?: string; image?: string } | null> {
  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  try {
    // Use OG title as search query first
    let searchQuery = ogTitle?.replace(/<[^>]*>/g, "").trim() || ""

    if (!searchQuery) {
      // Try nl-query param (present in redirected Naver mobile URLs)
      const urlObj = new URL(url)
      const nlQuery = urlObj.searchParams.get("nl-query") || urlObj.searchParams.get("query")
      if (nlQuery) {
        searchQuery = decodeURIComponent(nlQuery).trim()
      }
    }

    if (!searchQuery) {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname.toLowerCase()
      const pathParts = urlObj.pathname.split("/").filter(Boolean)

      // For smartstore/brand.naver URLs, DON'T search by store name alone
      // (e.g. "goodsea" → returns wrong product like 연어 instead of 당면만두)
      if (/smartstore\.naver|brand\.naver|m\.smartstore/i.test(hostname)) {
        // Only use meaningful non-store, non-ID path segments
        const meaningful = pathParts
          .map(p => decodeURIComponent(p))
          .filter(p => !/^\d+$/.test(p) && p !== "products" && p !== "items" && p !== pathParts[0])
        searchQuery = meaningful.pop() || ""
      } else {
        // For other shopping sites, try path-based extraction
        const meaningful = pathParts
          .map(p => decodeURIComponent(p))
          .filter(p => !/^\d+$/.test(p) && p !== "products" && p !== "items")
        searchQuery = meaningful.pop() || ""
      }
    }

    if (!searchQuery || searchQuery.length < 2) return null

    const res = await fetch(
      `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(searchQuery)}&display=1`,
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

async function scrapeOg(inputUrl: string) {
  // Resolve short URLs (naver.me, bit.ly, etc.) to get actual destination
  let url = inputUrl
  if (isShortUrl(inputUrl)) {
    url = await resolveUrl(inputUrl)
  }

  // Convert brand.naver.com to m.smartstore.naver.com BEFORE OG scraping
  // brand.naver.com is a JS SPA that returns "에러페이지" for server-side requests
  let scrapeUrl = url
  if (/brand\.naver\.com/i.test(url)) {
    scrapeUrl = url.replace("brand.naver.com", "m.smartstore.naver.com")
  }

  const domain = new URL(url).hostname.replace("www.", "")

  try {
    const { result, html } = await ogs({
      url: scrapeUrl,
      timeout: 8000,
      fetchOptions: {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        },
      },
    })
    const ogImage =
      result.ogImage && result.ogImage.length > 0
        ? result.ogImage[0].url
        : undefined

    // Filter out error/generic page titles from Naver SPA pages
    const rawTitle = result.ogTitle && !/에러페이지|error page/i.test(result.ogTitle) ? result.ogTitle : undefined

    // Extract page text snapshot for preservation
    const pageSnapshot = typeof html === "string" ? extractPageText(html) : undefined

    let ogData: Record<string, string | undefined> = {
      og_title: rawTitle,
      og_description: result.ogDescription || undefined,
      og_image: ogImage,
      og_url: result.ogUrl || url,
      og_domain: domain,
      page_snapshot: pageSnapshot && pageSnapshot.length > 30 ? pageSnapshot : undefined,
    }

    // Always try oEmbed for YouTube (OG scraping often returns empty/generic titles)
    const hostname = new URL(url).hostname.toLowerCase()
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
      const oembed = await fetchOEmbed(url)
      if (oembed?.title) {
        ogData.og_title = oembed.title
        // Include author in description so AI can produce richer comments
        const descParts = [oembed.author ? `채널: ${oembed.author}` : null, ogData.og_description].filter(Boolean)
        ogData.og_description = descParts.join(" — ") || undefined
        ogData.og_image = ogData.og_image || oembed.thumbnail
      }
    } else if (!ogData.og_title) {
      // Try oEmbed for other sites
      const oembed = await fetchOEmbed(url)
      if (oembed) {
        ogData.og_title = oembed.title
        ogData.og_description = ogData.og_description || (oembed.author ? `by ${oembed.author}` : undefined)
        ogData.og_image = ogData.og_image || oembed.thumbnail
      }
    }

    // Always try Naver Shopping for shopping domains (even if OG succeeded, enrich with category/price)
    const isShopping = /smartstore\.naver|brand\.naver|shopping\.naver|m\.smartstore|coupang|kurly|ssg\.com|11st\.co|gmarket|auction/i.test(domain)
    if (isShopping) {
      // Filter out error pages from OG title
      if (ogData.og_title && /에러페이지|error/i.test(ogData.og_title)) {
        ogData.og_title = undefined
      }

      const shop = await fetchNaverShopping(url, ogData.og_title)
      if (shop?.title) {
        ogData.og_title = ogData.og_title || shop.title
        ogData.og_description = [shop.category, shop.price, shop.brand].filter(Boolean).join(" | ")
        ogData.og_image = ogData.og_image || shop.image
      }
    } else if (!ogData.og_title) {
      const shop = await fetchNaverShopping(url, ogData.og_title)
      if (shop?.title) {
        ogData.og_title = shop.title
        ogData.og_description = [shop.category, shop.price, shop.brand].filter(Boolean).join(" | ")
        ogData.og_image = ogData.og_image || shop.image
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
  } else if (type === "file" && meta && typeof meta === "object" && "file_name" in meta) {
    const fm = meta as Record<string, unknown>
    tagContent = [content, fm.file_name as string, fm.ai_summary as string].filter(Boolean).join(" — ")
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
