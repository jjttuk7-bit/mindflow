import { getUser } from "@/lib/supabase/server"
import { generateEmbedding } from "@/lib/ai"
import { checkUsageLimit } from "@/lib/plans"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Check daily chat usage limit
  const { allowed, used, limit } = await checkUsageLimit(
    user.id,
    "ai_chat_per_day",
    "chat_messages",
    "day"
  )
  if (!allowed) {
    return NextResponse.json(
      {
        error: `Daily chat limit reached (${used}/${limit}). Upgrade to Pro for unlimited chats.`,
        used,
        limit,
      },
      { status: 403 }
    )
  }

  const { message, session_id } = await req.json()

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 })
  }

  // Create or reuse session
  let currentSessionId = session_id
  if (!currentSessionId) {
    const title = message.slice(0, 50).trim()
    const { data: session, error: sessionError } = await supabase
      .from("chat_sessions")
      .insert({ title, user_id: user.id })
      .select()
      .single()

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 400 })
    }
    currentSessionId = session.id
  }

  // Save user message
  const { error: userMsgError } = await supabase
    .from("chat_messages")
    .insert({
      session_id: currentSessionId,
      role: "user",
      content: message,
      user_id: user.id,
    })

  if (userMsgError) {
    return NextResponse.json({ error: userMsgError.message }, { status: 400 })
  }

  // RAG: generate embedding and search for relevant items
  const embedding = await generateEmbedding(message)

  const { data: matchedItems } = await supabase.rpc("match_items", {
    query_embedding: JSON.stringify(embedding),
    match_threshold: 0.3,
    match_count: 10,
  })

  const relevantItems = matchedItems || []

  // Build context string from relevant items
  const context = relevantItems
    .map(
      (item: { id: string; summary: string | null; content: string }, idx: number) =>
        `[${idx + 1}] ${item.summary || item.content.slice(0, 200)}`
    )
    .join("\n")

  // Collect source IDs
  const sourceIds = relevantItems.map((item: { id: string }) => item.id)

  // Call Gemini
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

  const systemPrompt = `You are a helpful assistant answering based on the user's personal knowledge base.
Use the context items below to answer the question. Reference items by number [1], [2], etc.
If no relevant context is found, say so honestly.
Answer in the same language as the question.

${context ? `Context:\n${context}` : "No relevant context found in the knowledge base."}`

  const result = await model.generateContent([
    { text: systemPrompt },
    { text: message },
  ])

  const reply = result.response.text().trim()

  // Save assistant message with sources
  const { error: assistantMsgError } = await supabase
    .from("chat_messages")
    .insert({
      session_id: currentSessionId,
      role: "assistant",
      content: reply,
      sources: sourceIds.length > 0 ? sourceIds : null,
      user_id: user.id,
    })

  if (assistantMsgError) {
    return NextResponse.json({ error: assistantMsgError.message }, { status: 400 })
  }

  return NextResponse.json({
    session_id: currentSessionId,
    message: reply,
    sources: relevantItems,
  })
}
