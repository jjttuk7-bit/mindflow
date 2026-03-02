import { getUser } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import ogs from "open-graph-scraper"

function isValidUrl(str: string): boolean {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
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

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  try {
    const formData = await req.formData()
    const title = formData.get("title") as string | null
    const text = formData.get("text") as string | null
    const url = formData.get("url") as string | null
    const media = formData.get("media") as File | null

    let type: "text" | "link" | "image" = "text"
    let content = ""
    let metadata: Record<string, unknown> = {}

    const sharedUrl = url || (text && isValidUrl(text.trim()) ? text.trim() : null)

    if (sharedUrl) {
      type = "link"
      content = sharedUrl
      const ogData = await scrapeOg(sharedUrl)
      metadata = { ...ogData }
      if (title) metadata.share_title = title
      if (text && text.trim() !== sharedUrl) metadata.share_note = text
    } else if (media && media.size > 0) {
      type = "image"
      const ext = media.name.split(".").pop() || "jpg"
      const path = `${user.id}/${Date.now()}.${ext}`
      const buffer = Buffer.from(await media.arrayBuffer())
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(path, buffer, { contentType: media.type })
      if (uploadError) throw uploadError
      const { data: publicUrl } = supabase.storage.from("images").getPublicUrl(path)
      content = publicUrl.publicUrl
      if (title) metadata.share_title = title
      if (text) metadata.share_note = text
    } else {
      type = "text"
      const parts = [title, text].filter(Boolean)
      content = parts.join("\n\n")
    }

    if (!content) {
      return NextResponse.redirect(new URL("/?error=empty_share", req.url))
    }

    const { data: item, error } = await supabase
      .from("items")
      .insert({ type, content, metadata, user_id: user.id })
      .select()
      .single()

    if (error) throw error

    const cookieHeader = req.headers.get("cookie") || ""
    let tagContent = content
    if (type === "link" && metadata) {
      const m = metadata as Record<string, string>
      const parts = [m.og_title, m.og_description, content].filter(Boolean)
      tagContent = parts.join(" — ")
    }
    fetch(`${req.nextUrl.origin}/api/ai/tag`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: cookieHeader },
      body: JSON.stringify({ item_id: item.id, content: tagContent, type }),
    }).catch(() => {})

    return NextResponse.redirect(new URL("/?shared=success", req.url))
  } catch (err) {
    console.error("Share target error:", err)
    return NextResponse.redirect(new URL("/?error=share_failed", req.url))
  }
}
