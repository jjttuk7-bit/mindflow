import { getUser } from "@/lib/supabase/server"
import { generateEmbedding, getOpenAI, MODEL_MAP } from "@/lib/ai"
import { checkUsageLimit } from "@/lib/plans"
import { withLogging } from "@/lib/logger"
import { rateLimit } from "@/lib/rate-limit"
import { validate, chatSchema } from "@/lib/validations"
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

  // 3-1: Fetch conversation history (last 10 messages = 5 pairs)
  const { data: historyMessages } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", currentSessionId)
    .order("created_at", { ascending: true })
    .limit(10)

  // Build OpenAI messages array from history
  const conversationHistory = (historyMessages || [])
    .slice(0, -1) // exclude the just-inserted user message (we add it separately)
    .map((msg: { role: string; content: string }) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }))

  // RAG: generate embedding and search for relevant items
  const embedding = await generateEmbedding(message)

  // 3-2: Parallel fetch — RAG items, todos, projects, recent items
  const [matchResult, todosResult, projectsResult, recentResult] = await Promise.all([
    supabase.rpc("match_items", {
      query_embedding: JSON.stringify(embedding),
      match_threshold: 0.3,
      match_count: 10,
    }),
    supabase
      .from("todos")
      .select("content, is_completed, due_date, project_id")
      .eq("user_id", user.id)
      .eq("is_completed", false)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("projects")
      .select("name, description, color")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("items")
      .select("type, content, summary, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  const relevantItems = matchResult.data || []
  const pendingTodos = todosResult.data || []
  const projects = projectsResult.data || []
  const recentItems = recentResult.data || []

  // Build context string from relevant items — prefer summary, include similarity score
  const context = relevantItems
    .map(
      (item: { id: string; summary: string | null; content: string; similarity?: number }, idx: number) => {
        const text = item.summary || item.content.slice(0, 150)
        const score = item.similarity ? ` (관련도: ${(item.similarity * 100).toFixed(0)}%)` : ""
        return `[${idx + 1}] ${text}${score}`
      }
    )
    .join("\n")

  // Collect source IDs
  const sourceIds = relevantItems.map((item: { id: string }) => item.id)

  // Build rich context sections
  const todoSection = pendingTodos.length > 0
    ? `\n[현재 할 일 목록]\n${pendingTodos.map((t: { content: string; due_date: string | null }) => `- ${t.content}${t.due_date ? ` (기한: ${t.due_date})` : ""}`).join("\n")}`
    : ""

  const projectSection = projects.length > 0
    ? `\n[프로젝트]\n${projects.map((p: { name: string; description: string | null }) => `- ${p.name}${p.description ? `: ${p.description}` : ""}`).join("\n")}`
    : ""

  const recentSection = recentItems.length > 0
    ? `\n[최근 저장한 항목]\n${recentItems.map((i: { type: string; summary: string | null; content: string }) => `- [${i.type}] ${i.summary || i.content.slice(0, 100)}`).join("\n")}`
    : ""

  const systemPrompt = `당신은 DotLine의 AI 지식 동반자입니다. 사용자의 개인 지식 베이스를 기반으로 도움을 제공합니다.

역할: 지식 검색([1],[2] 출처 표시), 할 일 관리, 요약/정리, 아이디어 연결, 콘텐츠 생성(블로그/SNS/뉴스레터), 트렌드 분석, 비즈니스 지원

규칙:
- 관련 컨텍스트가 없으면 솔직히 말하세요
- 사용자의 질문 언어에 맞춰 간결하고 실용적으로 답변
- 할 일/행동 항목은 체크리스트 형태로 제시
- 제안 형식 — 할 일: > **할 일 제안**: 내용 / 메모: > **메모 제안**: 내용

${context ? `[검색된 컨텍스트]\n${context}` : "지식 베이스에서 관련 컨텍스트를 찾지 못했습니다."}${todoSection}${projectSection}${recentSection}`

  // 3-3: Streaming response via SSE
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send session info first
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "session", session_id: currentSessionId, sources: relevantItems })}\n\n`)
        )

        const completion = await getOpenAI().chat.completions.create({
          model: MODEL_MAP.chat,
          messages: [
            { role: "system", content: systemPrompt },
            ...conversationHistory,
            { role: "user", content: message },
          ],
          stream: true,
        })

        let fullReply = ""

        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content || ""
          if (text) {
            fullReply += text
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "chunk", text })}\n\n`)
            )
          }
        }

        // Save complete assistant message to DB
        await supabase
          .from("chat_messages")
          .insert({
            session_id: currentSessionId,
            role: "assistant",
            content: fullReply.trim(),
            sources: sourceIds.length > 0 ? sourceIds : null,
            user_id: user.id,
          })

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
        )
        controller.close()
        log.success({ sources: relevantItems.length, streamed: true })
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Stream error"
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", error: errMsg })}\n\n`)
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
