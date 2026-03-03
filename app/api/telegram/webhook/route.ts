import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import {
  sendTelegramMessage,
  getTelegramFileUrl,
  verifyTelegramWebhook,
} from "@/lib/telegram"
import { generateTags, generateSummary, generateEmbedding } from "@/lib/ai"
import { PLAN_LIMITS } from "@/lib/plans"

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const TELEGRAM_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || ""

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TelegramUpdate = any

export async function POST(req: NextRequest) {
  try {
    // Verify webhook secret
    const headerToken = req.headers.get("x-telegram-bot-api-secret-token")
    if (TELEGRAM_SECRET && !verifyTelegramWebhook(TELEGRAM_SECRET, headerToken)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const update: TelegramUpdate = await req.json()
    const message = update.message
    if (!message) return NextResponse.json({ ok: true })

    const chatId = String(message.chat.id)
    const supabase = getServiceSupabase()

    // Handle /start command for account linking
    const text = message.text || ""
    if (text.startsWith("/start")) {
      const token = text.split(" ")[1]
      if (token) {
        return await handleStartCommand(supabase, chatId, token)
      }
      await sendTelegramMessage(
        chatId,
        "Welcome to DotLine! Link your account from the Settings page in the app."
      )
      return NextResponse.json({ ok: true })
    }

    // Look up user by telegram_chat_id
    const { data: settings } = await supabase
      .from("user_settings")
      .select("*")
      .eq("telegram_chat_id", chatId)
      .single()

    if (!settings) {
      await sendTelegramMessage(
        chatId,
        "Please link your account first. Go to DotLine Settings and click 'Link Telegram'."
      )
      return NextResponse.json({ ok: true })
    }

    const userId = settings.user_id
    const plan = settings.plan || "free"

    // Handle commands
    if (text.startsWith("/search")) {
      const keyword = text.replace("/search", "").trim()
      return await handleSearchCommand(supabase, chatId, userId, keyword)
    }
    if (text === "/recent") {
      return await handleRecentCommand(supabase, chatId, userId)
    }
    if (text === "/todo") {
      return await handleTodoCommand(supabase, chatId, userId)
    }
    if (text.startsWith("/")) {
      await sendTelegramMessage(
        chatId,
        "Available commands:\n/search <keyword> - Search your items\n/recent - Last 5 items\n/todo - Pending todos"
      )
      return NextResponse.json({ ok: true })
    }

    // Check monthly Telegram capture limit for free users
    const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]
    const monthLimit = limits.telegram_captures_per_month
    if (monthLimit !== Infinity) {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const { count } = await supabase
        .from("items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("source", "telegram")
        .gte("created_at", startOfMonth)

      if ((count || 0) >= monthLimit) {
        await sendTelegramMessage(
          chatId,
          `You've reached your monthly Telegram capture limit (${monthLimit}). Upgrade to Pro for unlimited captures!`
        )
        return NextResponse.json({ ok: true })
      }
    }

    // Process message types
    if (message.photo) {
      return await handlePhotoMessage(supabase, chatId, userId, message)
    }
    if (message.voice) {
      return await handleVoiceMessage(supabase, chatId, userId, message)
    }
    if (message.text) {
      return await handleTextMessage(supabase, chatId, userId, message.text)
    }

    await sendTelegramMessage(chatId, "Unsupported message type. Send text, photos, or voice messages.")
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Telegram webhook error:", err)
    return NextResponse.json({ ok: true }) // Always return 200 to Telegram
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleStartCommand(supabase: any, chatId: string, token: string) {
  // Find user_settings row where preferences->telegram_link_token matches
  const { data: allSettings } = await supabase
    .from("user_settings")
    .select("*")
    .not("preferences", "is", null)

  const matchingSettings = (allSettings || []).find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) => s.preferences?.telegram_link_token === token
  )

  if (!matchingSettings) {
    await sendTelegramMessage(
      chatId,
      "Invalid or expired link token. Please generate a new link from the DotLine Settings page."
    )
    return NextResponse.json({ ok: true })
  }

  // Update user_settings with telegram_chat_id and clear the token
  const updatedPreferences = { ...matchingSettings.preferences }
  delete updatedPreferences.telegram_link_token

  await supabase
    .from("user_settings")
    .update({
      telegram_chat_id: chatId,
      telegram_linked_at: new Date().toISOString(),
      preferences: updatedPreferences,
      updated_at: new Date().toISOString(),
    })
    .eq("id", matchingSettings.id)

  await sendTelegramMessage(
    chatId,
    "Account linked successfully! You can now send messages, photos, and voice notes to capture them in DotLine."
  )
  return NextResponse.json({ ok: true })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSearchCommand(supabase: any, chatId: string, userId: string, keyword: string) {
  if (!keyword) {
    await sendTelegramMessage(chatId, "Usage: /search <keyword>")
    return NextResponse.json({ ok: true })
  }

  const { data: items } = await supabase
    .from("items")
    .select("id, type, content, summary, created_at")
    .eq("user_id", userId)
    .ilike("content", `%${keyword}%`)
    .order("created_at", { ascending: false })
    .limit(5)

  if (!items || items.length === 0) {
    await sendTelegramMessage(chatId, `No results found for "${keyword}".`)
    return NextResponse.json({ ok: true })
  }

  const lines = items.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (item: any, i: number) => {
      const preview = (item.summary || item.content || "").substring(0, 80)
      const date = new Date(item.created_at).toLocaleDateString()
      return `${i + 1}. [${item.type}] ${preview}... (${date})`
    }
  )

  await sendTelegramMessage(chatId, `Search results for "${keyword}":\n\n${lines.join("\n")}`)
  return NextResponse.json({ ok: true })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleRecentCommand(supabase: any, chatId: string, userId: string) {
  const { data: items } = await supabase
    .from("items")
    .select("id, type, content, summary, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5)

  if (!items || items.length === 0) {
    await sendTelegramMessage(chatId, "No items yet. Start capturing!")
    return NextResponse.json({ ok: true })
  }

  const lines = items.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (item: any, i: number) => {
      const preview = (item.summary || item.content || "").substring(0, 80)
      const date = new Date(item.created_at).toLocaleDateString()
      return `${i + 1}. [${item.type}] ${preview}... (${date})`
    }
  )

  await sendTelegramMessage(chatId, `Your recent items:\n\n${lines.join("\n")}`)
  return NextResponse.json({ ok: true })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleTodoCommand(supabase: any, chatId: string, userId: string) {
  const { data: todos } = await supabase
    .from("todos")
    .select("id, content, due_date")
    .eq("user_id", userId)
    .eq("is_completed", false)
    .order("created_at", { ascending: false })
    .limit(10)

  if (!todos || todos.length === 0) {
    await sendTelegramMessage(chatId, "No pending todos. You're all caught up!")
    return NextResponse.json({ ok: true })
  }

  const lines = todos.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (todo: any, i: number) => {
      const due = todo.due_date ? ` (due: ${todo.due_date})` : ""
      return `${i + 1}. ${todo.content}${due}`
    }
  )

  await sendTelegramMessage(chatId, `Pending todos:\n\n${lines.join("\n")}`)
  return NextResponse.json({ ok: true })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleTextMessage(supabase: any, chatId: string, userId: string, text: string) {
  // Detect URLs
  const urlRegex = /https?:\/\/[^\s]+/gi
  const urls = text.match(urlRegex)
  const type = urls && urls.length > 0 ? "link" : "text"
  const metadata = type === "link" ? { og_url: urls![0], og_domain: new URL(urls![0]).hostname.replace("www.", "") } : {}

  const { data: item, error } = await supabase
    .from("items")
    .insert({
      type,
      content: text,
      metadata,
      user_id: userId,
      source: "telegram",
    })
    .select()
    .single()

  if (error) {
    console.error("Error saving item:", error)
    await sendTelegramMessage(chatId, "Failed to save. Please try again.")
    return NextResponse.json({ ok: true })
  }

  // Fire-and-forget AI tagging using direct function calls
  processAiTagging(supabase, item.id, text, type, userId).catch((err) =>
    console.error("AI tagging error:", err)
  )

  await sendTelegramMessage(chatId, `Saved! (${type === "link" ? "link" : "text"})`)
  return NextResponse.json({ ok: true })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePhotoMessage(supabase: any, chatId: string, userId: string, message: any) {
  // Get largest photo size
  const photo = message.photo[message.photo.length - 1]
  const caption = message.caption || ""

  try {
    const fileUrl = await getTelegramFileUrl(photo.file_id)

    // Download the file
    const fileRes = await fetch(fileUrl)
    const fileBuffer = await fileRes.arrayBuffer()
    const fileName = `telegram/${userId}/${Date.now()}_${photo.file_id}.jpg`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("items-images")
      .upload(fileName, fileBuffer, {
        contentType: "image/jpeg",
        upsert: false,
      })

    if (uploadError) {
      console.error("Upload error:", uploadError)
      await sendTelegramMessage(chatId, "Failed to upload image. Please try again.")
      return NextResponse.json({ ok: true })
    }

    const { data: publicUrl } = supabase.storage
      .from("items-images")
      .getPublicUrl(fileName)

    const { data: item, error } = await supabase
      .from("items")
      .insert({
        type: "image",
        content: caption || "Image from Telegram",
        metadata: { image_url: publicUrl.publicUrl },
        user_id: userId,
        source: "telegram",
      })
      .select()
      .single()

    if (error) {
      console.error("Error saving image item:", error)
      await sendTelegramMessage(chatId, "Failed to save image. Please try again.")
      return NextResponse.json({ ok: true })
    }

    // Fire-and-forget AI tagging
    if (caption) {
      processAiTagging(supabase, item.id, caption, "image", userId).catch((err) =>
        console.error("AI tagging error:", err)
      )
    }

    await sendTelegramMessage(chatId, "Saved! (image)")
  } catch (err) {
    console.error("Photo processing error:", err)
    await sendTelegramMessage(chatId, "Failed to process image. Please try again.")
  }

  return NextResponse.json({ ok: true })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleVoiceMessage(supabase: any, chatId: string, userId: string, message: any) {
  const voice = message.voice

  try {
    const fileUrl = await getTelegramFileUrl(voice.file_id)

    // Download the file
    const fileRes = await fetch(fileUrl)
    const fileBuffer = await fileRes.arrayBuffer()
    const fileName = `telegram/${userId}/${Date.now()}_${voice.file_id}.ogg`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("items-audio")
      .upload(fileName, fileBuffer, {
        contentType: "audio/ogg",
        upsert: false,
      })

    if (uploadError) {
      console.error("Upload error:", uploadError)
      await sendTelegramMessage(chatId, "Failed to upload voice. Please try again.")
      return NextResponse.json({ ok: true })
    }

    const { data: publicUrl } = supabase.storage
      .from("items-audio")
      .getPublicUrl(fileName)

    const { data: item, error } = await supabase
      .from("items")
      .insert({
        type: "voice",
        content: "Voice message from Telegram",
        metadata: {
          file_url: publicUrl.publicUrl,
          duration: voice.duration || 0,
        },
        user_id: userId,
        source: "telegram",
      })
      .select()
      .single()

    if (error) {
      console.error("Error saving voice item:", error)
      await sendTelegramMessage(chatId, "Failed to save voice. Please try again.")
      return NextResponse.json({ ok: true })
    }

    // Fire-and-forget AI tagging
    processAiTagging(supabase, item.id, "Voice message", "voice", userId).catch((err) =>
      console.error("AI tagging error:", err)
    )

    await sendTelegramMessage(chatId, "Saved! (voice)")
  } catch (err) {
    console.error("Voice processing error:", err)
    await sendTelegramMessage(chatId, "Failed to process voice. Please try again.")
  }

  return NextResponse.json({ ok: true })
}

/**
 * Direct AI tagging for Telegram items (no cookie auth needed).
 * Mirrors the logic in /api/ai/tag but uses the service role client.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processAiTagging(supabase: any, itemId: string, content: string, type: string, userId: string) {
  // Get existing tags for reuse
  const { data: existingTags } = await supabase
    .from("tags")
    .select("name")
    .eq("user_id", userId)

  const tagNames = existingTags?.map((t: { name: string }) => t.name) || []

  // Run AI tasks in parallel
  const [suggestedTags, summary, embedding] = await Promise.all([
    generateTags(content, type, tagNames),
    generateSummary(content),
    generateEmbedding(content),
  ])

  // Upsert tags and create relations
  for (const tagName of suggestedTags) {
    const { data: tag } = await supabase
      .from("tags")
      .upsert({ name: tagName, user_id: userId }, { onConflict: "name,user_id" })
      .select()
      .single()

    if (tag) {
      await supabase
        .from("item_tags")
        .upsert(
          { item_id: itemId, tag_id: tag.id },
          { onConflict: "item_id,tag_id" }
        )
    }
  }

  // Update item with summary, embedding, and context
  const updates: Record<string, unknown> = {}
  if (summary) updates.summary = summary
  if (embedding) updates.embedding = JSON.stringify(embedding)

  const now = new Date()
  const hour = now.getHours()
  const timeOfDay =
    hour < 6 ? "night" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
  updates.context = {
    source: "telegram",
    time_of_day: timeOfDay,
    day_of_week: days[now.getDay()],
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from("items").update(updates).eq("id", itemId)
  }
}
