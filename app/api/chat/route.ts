import { getUser } from "@/lib/supabase/server"
import { generateEmbedding } from "@/lib/ai"
import { checkUsageLimit } from "@/lib/plans"
import { withLogging } from "@/lib/logger"
import { rateLimit } from "@/lib/rate-limit"
import { validate, chatSchema } from "@/lib/validations"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { maxRequests: 10, windowMs: 60_000 })
  if (limited) return limited

  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const log = withLogging("/api/chat").start(user.id)

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

  const raw = await req.json()
  const parsed = validate(chatSchema, raw)
  if (!parsed.success) return parsed.error
  const { message, session_id } = parsed.data

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

  const systemPrompt = `당신은 Mindflow의 AI 어시스턴트입니다. 사용자의 개인 지식 베이스를 기반으로 도움을 제공합니다.

핵심 역할:
1. 지식 검색: 저장된 항목에서 관련 내용을 찾아 답변합니다. [1], [2] 등으로 출처를 표시하세요.
2. 할 일 관리: 할 일 생성, 정리, 우선순위 제안을 도와줍니다.
3. 요약 & 정리: 여러 메모를 종합하거나, 특정 주제의 기록을 요약해줍니다.
4. 아이디어 연결: 서로 관련된 메모나 아이디어를 연결하여 새로운 인사이트를 제안합니다.
5. 실행 가능한 조언: 단순 정보 제공이 아니라, 구체적인 다음 행동을 제안합니다.

규칙:
- 관련 컨텍스트가 없으면 솔직히 말하세요.
- 사용자의 질문 언어에 맞춰 답변하세요.
- 간결하고 실용적으로 답변하세요.
- 할 일이나 행동 항목이 있으면 체크리스트 형태로 제시하세요.

${context ? `컨텍스트:\n${context}` : "지식 베이스에서 관련 컨텍스트를 찾지 못했습니다."}`

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

  log.success({ sources: relevantItems.length })
  return NextResponse.json({
    session_id: currentSessionId,
    message: reply,
    sources: relevantItems,
  })
}
