import { getUser } from "@/lib/supabase/server"
import { getOpenAI, MODEL_MAP } from "@/lib/ai"
import { checkUsageLimit } from "@/lib/plans"
import { withLogging } from "@/lib/logger"
import { rateLimit } from "@/lib/rate-limit"
import { validate, chatSchema } from "@/lib/validations"
import { AGENT_TOOLS, executeTool, type ToolResult } from "@/lib/chat-tools"
import { NextRequest, NextResponse } from "next/server"
import type OpenAI from "openai"

const MAX_TOOL_STEPS = 2
const TOOL_TIMEOUT_MS = 10_000

type AgentMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam

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

  // Fetch conversation history (last 10 messages)
  const { data: historyMessages } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", currentSessionId)
    .order("created_at", { ascending: true })
    .limit(10)

  const conversationHistory = (historyMessages || [])
    .slice(0, -1)
    .map((msg: { role: string; content: string }) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }))

  // Parallel fetch: todos, projects, recent items
  const [todosResult, projectsResult, recentResult] = await Promise.all([
    supabase
      .from("todos")
      .select("content, is_completed, due_date")
      .eq("user_id", user.id)
      .eq("is_completed", false)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("projects")
      .select("name, description")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("items")
      .select("type, content, summary, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  const pendingTodos = todosResult.data || []
  const projects = projectsResult.data || []
  const recentItems = recentResult.data || []

  // Build context sections
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

역할: 지식 검색, 할 일 관리, 요약/정리, 아이디어 연결, 콘텐츠 생성, 트렌드 분석, 비즈니스 지원

도구 사용 가이드:
- search: 사용자의 질문에 답하기 위해 관련 항목을 검색할 때 사용
- summarize: 검색 결과를 종합 요약할 때 사용 (search 결과의 item ID 필요)
- compare: 두 개 이상 항목을 비교할 때 사용 (search 결과의 item ID 필요)
- create_memo: 사용자가 메모/할일 생성을 요청할 때만 사용

규칙:
- 관련 컨텍스트가 없으면 솔직히 말하세요
- 사용자의 질문 언어에 맞춰 간결하고 실용적으로 답변
- 할 일/행동 항목은 체크리스트 형태로 제시
- 검색 결과 참조 시 [1], [2] 형식으로 출처 표시
- 도구 없이 답할 수 있는 일반 대화는 도구를 호출하지 마세요
- 제안 형식 — 할 일: > **할 일 제안**: 내용 / 메모: > **메모 제안**: 내용
${todoSection}${projectSection}${recentSection}`

  // SSE streaming with tool calling loop
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        // Send session info
        send({ type: "session", session_id: currentSessionId, sources: [] })

        const messages: AgentMessage[] = [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
          { role: "user", content: message },
        ]

        const memoCount = { current: 0 }
        let allSourceIds: string[] = []
        let toolSteps = 0

        // Agent loop: call LLM, execute tools if requested, repeat
        while (toolSteps <= MAX_TOOL_STEPS) {
          const isLastStep = toolSteps === MAX_TOOL_STEPS

          const completion = await getOpenAI().chat.completions.create({
            model: MODEL_MAP.chat,
            messages,
            tools: isLastStep ? undefined : AGENT_TOOLS,
            stream: false,
          })

          const choice = completion.choices[0]

          // No tool calls — stream the final response
          if (!choice.message.tool_calls || choice.message.tool_calls.length === 0) {
            // If the non-streaming call already has content, use it as context
            // Re-call with streaming for real-time output
            const streamCompletion = await getOpenAI().chat.completions.create({
              model: MODEL_MAP.chat,
              messages,
              stream: true,
            })

            let fullReply = ""
            for await (const chunk of streamCompletion) {
              const text = chunk.choices[0]?.delta?.content || ""
              if (text) {
                fullReply += text
                send({ type: "chunk", text })
              }
            }

            // Save assistant message
            await supabase.from("chat_messages").insert({
              session_id: currentSessionId,
              role: "assistant",
              content: fullReply.trim(),
              sources: allSourceIds.length > 0 ? allSourceIds : null,
              user_id: user.id,
            })

            // Send sources with the done event
            if (allSourceIds.length > 0) {
              send({ type: "sources", source_ids: allSourceIds })
            }

            send({ type: "done" })
            controller.close()
            log.success({ sources: allSourceIds.length, toolSteps, streamed: true })
            return
          }

          // Process tool calls — add assistant message with tool_calls to history
          messages.push({
            role: "assistant",
            content: choice.message.content || "",
            tool_calls: choice.message.tool_calls,
          })

          for (const toolCall of choice.message.tool_calls) {
            if (toolCall.type !== "function") continue
            const toolName = toolCall.function.name
            let args: Record<string, unknown> = {}
            try {
              args = JSON.parse(toolCall.function.arguments)
            } catch {
              args = {}
            }

            // Send step indicator to client
            send({ type: "tool_start", tool: toolName, args })

            // Execute with timeout
            let result: ToolResult
            try {
              result = await Promise.race([
                executeTool(toolName, args, supabase, user.id, memoCount),
                new Promise<never>((_, reject) =>
                  setTimeout(() => reject(new Error("Tool timeout")), TOOL_TIMEOUT_MS)
                ),
              ])
            } catch (err) {
              result = {
                tool: toolName,
                summary: `도구 실행 실패: ${err instanceof Error ? err.message : "unknown error"}`,
                data: null,
              }
            }

            // Collect source IDs from search results
            if (toolName === "search" && result.data) {
              const searchItems = result.data as Array<{ id: string }>
              allSourceIds = [...allSourceIds, ...searchItems.map((i) => i.id)]
            }

            send({ type: "tool_result", tool: toolName, summary: result.summary, ...(toolName === "create_memo" && result.data && typeof result.data === "object" ? result.data : {}) })

            // Add tool result to messages for next LLM call
            messages.push({
              role: "tool",
              content: JSON.stringify(result.data),
              tool_call_id: toolCall.id,
            })
          }

          toolSteps++
        }

        // Fallback: hit max steps without a final answer
        send({ type: "chunk", text: "요청을 처리하는 데 너무 많은 단계가 필요합니다. 질문을 더 구체적으로 해주세요." })
        send({ type: "done" })
        controller.close()
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Stream error"
        send({ type: "error", error: errMsg })
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
