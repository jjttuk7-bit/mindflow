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

  // 3-1: Fetch conversation history (last 10 messages = 5 pairs)
  const { data: historyMessages } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", currentSessionId)
    .order("created_at", { ascending: true })
    .limit(10)

  // Build Gemini contents array from history
  const conversationHistory = (historyMessages || [])
    .slice(0, -1) // exclude the just-inserted user message (we add it separately)
    .map((msg: { role: string; content: string }) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
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

  // Build context string from relevant items
  const context = relevantItems
    .map(
      (item: { id: string; summary: string | null; content: string }, idx: number) =>
        `[${idx + 1}] ${item.summary || item.content.slice(0, 200)}`
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

  // Call Gemini with streaming
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

  const systemPrompt = `당신은 Mindflow의 AI 지식 동반자입니다. 사용자의 개인 지식 베이스를 기반으로 정보 검색부터 콘텐츠 생성, 비즈니스 지원까지 도움을 제공합니다.

핵심 역할:
1. 지식 검색: 저장된 항목에서 관련 내용을 찾아 답변합니다. [1], [2] 등으로 출처를 표시하세요.
2. 할 일 관리: 할 일 생성, 정리, 우선순위 제안을 도와줍니다.
3. 요약 & 정리: 여러 메모를 종합하거나, 특정 주제의 기록을 요약해줍니다.
4. 아이디어 연결: 서로 관련된 메모나 아이디어를 연결하여 새로운 인사이트를 제안합니다.
5. 실행 가능한 조언: 단순 정보 제공이 아니라, 구체적인 다음 행동을 제안합니다.

확장 역할 — 지식을 성과로 전환:
6. 콘텐츠 생성: 저장된 지식을 바탕으로 블로그 글, SNS 포스트, 뉴스레터, 이메일 초안을 작성합니다.
   - "이번 주 저장한 내용으로 블로그 글 써줘" → 저장된 항목을 참고해 초안 작성
   - "트윗/인스타 포스트로 만들어줘" → 짧고 임팩트 있는 형태로 변환
   - "이 내용을 뉴스레터로 정리해줘" → 독자 친화적 구조로 재구성
7. 트렌드 분석 & 기회 발견: 저장된 항목들의 패턴을 분석하여 인사이트를 제공합니다.
   - "최근 내 관심사 트렌드 분석해줘" → 저장 패턴에서 관심 분야 변화 감지
   - "이 분야에서 기회가 뭐가 있을까?" → 저장된 자료 기반 기회 분석
   - 주간/월간 관심사 변화를 자동 감지하고 의미 있는 패턴 제시
8. 비즈니스 지원: 업무와 프로젝트에 실질적 도움을 줍니다.
   - "클라이언트 미팅 내용 정리해줘" → 핵심 요약 + 액션 아이템 추출
   - "제안서 초안 써줘" → 저장된 자료 기반으로 구조화된 제안서
   - "이 프로젝트 진행상황 정리해줘" → 프로젝트별 할 일/메모 종합

규칙:
- 관련 컨텍스트가 없으면 솔직히 말하세요.
- 사용자의 질문 언어에 맞춰 답변하세요.
- 간결하고 실용적으로 답변하세요.
- 할 일이나 행동 항목이 있으면 체크리스트 형태로 제시하세요.
- 콘텐츠 생성 시: 저장된 항목을 적극 활용하되 출처를 표시하고, 사용자의 톤/스타일에 맞추세요.
- 분석/리포트 요청 시: 데이터 기반으로 구체적 수치와 패턴을 제시하세요.

제안 형식 (할 일이나 메모를 제안할 때 반드시 아래 형식을 사용하세요):
- 할 일 제안: > **할 일 제안**: 할 일 내용
- 메모 제안: > **메모 제안**: 메모 내용

${context ? `검색된 컨텍스트:\n${context}` : "지식 베이스에서 관련 컨텍스트를 찾지 못했습니다."}${todoSection}${projectSection}${recentSection}`

  // 3-3: Streaming response via SSE
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send session info first
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "session", session_id: currentSessionId, sources: relevantItems })}\n\n`)
        )

        const result = await model.generateContentStream({
          contents: [
            ...conversationHistory,
            { role: "user", parts: [{ text: message }] },
          ],
          systemInstruction: { role: "user", parts: [{ text: systemPrompt }] },
        })

        let fullReply = ""

        for await (const chunk of result.stream) {
          const text = chunk.text()
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
