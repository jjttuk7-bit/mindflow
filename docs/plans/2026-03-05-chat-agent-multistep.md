# DL Agent Multi-step Chat Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade DL Agent chat from single RAG search to a multi-step agent with OpenAI function calling, supporting search/summarize/compare/create_memo tools with real-time step indicators.

**Architecture:** OpenAI function calling selects tools, server executes them, results feed back to LLM for final streaming response. Max 2 chaining steps. SSE extended with tool_start/tool_result events.

**Tech Stack:** OpenAI gpt-4.1-mini with function calling, Supabase pgvector, Next.js SSE streaming, React

---

### Task 1: Create chat-tools.ts — Tool Definitions

**Files:**
- Create: `lib/chat-tools.ts`

**Step 1: Create the tool definitions and type exports**

```typescript
import { SupabaseClient } from "@supabase/supabase-js"
import { generateEmbedding, generateSummary, getOpenAI, MODEL_MAP } from "@/lib/ai"
import { SIMILARITY_THRESHOLDS } from "@/lib/constants"

// ── Tool Definitions (OpenAI function calling format) ──

export const AGENT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search",
      description: "Search the user's knowledge base by semantic similarity. Use when the user asks about their saved items, wants to find something, or when you need context to answer their question.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query in natural language",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "summarize",
      description: "Summarize multiple items from the knowledge base. Use when the user asks for an overview, digest, or summary of several items or a topic.",
      parameters: {
        type: "object",
        properties: {
          item_ids: {
            type: "array",
            items: { type: "string" },
            description: "IDs of items to summarize (from a previous search result)",
          },
          focus: {
            type: "string",
            description: "Optional focus area for the summary",
          },
        },
        required: ["item_ids"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "compare",
      description: "Compare 2 or more items to find differences, commonalities, or relationships. Use when the user wants to compare saved items or analyze connections.",
      parameters: {
        type: "object",
        properties: {
          item_ids: {
            type: "array",
            items: { type: "string" },
            minItems: 2,
            description: "IDs of items to compare (from a previous search result)",
          },
          aspect: {
            type: "string",
            description: "Optional specific aspect to focus the comparison on",
          },
        },
        required: ["item_ids"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_memo",
      description: "Create a new memo or todo item. Use when the user asks to save something, create a reminder, or add a todo during conversation.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["memo", "todo"],
            description: "Whether to create a memo (text item) or a todo",
          },
          content: {
            type: "string",
            description: "The content of the memo or todo",
          },
        },
        required: ["type", "content"],
      },
    },
  },
] as const

// ── Tool Result Type ──

export interface ToolResult {
  tool: string
  summary: string
  data: unknown
}

// ── Tool Handlers ──

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  supabase: SupabaseClient,
  userId: string,
  memoCount: { current: number }
): Promise<ToolResult> {
  switch (toolName) {
    case "search":
      return executeSearch(args.query as string, supabase)
    case "summarize":
      return executeSummarize(
        args.item_ids as string[],
        args.focus as string | undefined,
        supabase,
        userId
      )
    case "compare":
      return executeCompare(
        args.item_ids as string[],
        args.aspect as string | undefined,
        supabase,
        userId
      )
    case "create_memo":
      return executeCreateMemo(
        args.type as "memo" | "todo",
        args.content as string,
        supabase,
        userId,
        memoCount
      )
    default:
      return { tool: toolName, summary: "Unknown tool", data: null }
  }
}

// ── search ──

async function executeSearch(
  query: string,
  supabase: SupabaseClient
): Promise<ToolResult> {
  const embedding = await generateEmbedding(query)

  const { data } = await supabase.rpc("match_items", {
    query_embedding: JSON.stringify(embedding),
    match_threshold: SIMILARITY_THRESHOLDS.SEARCH,
    match_count: 8,
  })

  const items = (data || []).map(
    (item: { id: string; content: string; summary: string | null; type: string; similarity: number }) => ({
      id: item.id,
      type: item.type,
      text: item.summary || item.content?.slice(0, 200),
      similarity: Math.round(item.similarity * 100),
    })
  )

  return {
    tool: "search",
    summary: `${items.length}개 관련 항목 발견`,
    data: items,
  }
}

// ── summarize ──

async function executeSummarize(
  itemIds: string[],
  focus: string | undefined,
  supabase: SupabaseClient,
  userId: string
): Promise<ToolResult> {
  const { data: items } = await supabase
    .from("items")
    .select("id, type, content, summary")
    .eq("user_id", userId)
    .in("id", itemIds.slice(0, 10))

  if (!items || items.length === 0) {
    return { tool: "summarize", summary: "항목을 찾을 수 없습니다", data: null }
  }

  const textsBlock = items
    .map((i) => `[${i.type}] ${i.summary || i.content?.slice(0, 300)}`)
    .join("\n\n")

  const focusInstruction = focus ? `\n특히 "${focus}"에 초점을 맞춰 요약하세요.` : ""

  const result = await getOpenAI().chat.completions.create({
    model: MODEL_MAP.summary,
    messages: [
      {
        role: "user",
        content: `다음 항목들을 종합적으로 요약하세요. 핵심 주제, 공통 패턴, 주요 인사이트를 포함하세요.${focusInstruction}\n\n${textsBlock}`,
      },
    ],
  })

  const summaryText = result.choices[0].message.content?.trim() || ""

  return {
    tool: "summarize",
    summary: `${items.length}개 항목 요약 완료`,
    data: { summary: summaryText, item_count: items.length },
  }
}

// ── compare ──

async function executeCompare(
  itemIds: string[],
  aspect: string | undefined,
  supabase: SupabaseClient,
  userId: string
): Promise<ToolResult> {
  const { data: items } = await supabase
    .from("items")
    .select("id, type, content, summary")
    .eq("user_id", userId)
    .in("id", itemIds.slice(0, 5))

  if (!items || items.length < 2) {
    return { tool: "compare", summary: "비교할 항목이 부족합니다", data: null }
  }

  const textsBlock = items
    .map((i, idx) => `[항목 ${idx + 1} - ${i.type}]\n${i.summary || i.content?.slice(0, 400)}`)
    .join("\n\n---\n\n")

  const aspectInstruction = aspect ? `\n특히 "${aspect}" 관점에서 비교하세요.` : ""

  const result = await getOpenAI().chat.completions.create({
    model: MODEL_MAP.summary,
    messages: [
      {
        role: "user",
        content: `다음 항목들을 비교 분석하세요. 공통점, 차이점, 연결 관계를 구체적으로 설명하세요.${aspectInstruction}\n\n${textsBlock}`,
      },
    ],
  })

  const comparison = result.choices[0].message.content?.trim() || ""

  return {
    tool: "compare",
    summary: `${items.length}개 항목 비교 완료`,
    data: { comparison, item_count: items.length },
  }
}

// ── create_memo ──

const MAX_MEMOS_PER_SESSION = 5

async function executeCreateMemo(
  type: "memo" | "todo",
  content: string,
  supabase: SupabaseClient,
  userId: string,
  memoCount: { current: number }
): Promise<ToolResult> {
  if (memoCount.current >= MAX_MEMOS_PER_SESSION) {
    return {
      tool: "create_memo",
      summary: `세션당 최대 ${MAX_MEMOS_PER_SESSION}개까지 생성 가능합니다`,
      data: { created: false },
    }
  }

  if (type === "todo") {
    const { error } = await supabase
      .from("todos")
      .insert({ content, user_id: userId })

    if (error) {
      return { tool: "create_memo", summary: "할 일 생성 실패", data: { created: false } }
    }

    memoCount.current++
    return {
      tool: "create_memo",
      summary: `할 일 생성 완료: "${content.slice(0, 30)}..."`,
      data: { created: true, type: "todo" },
    }
  } else {
    const { error } = await supabase
      .from("items")
      .insert({ type: "text", content, user_id: userId, source: "chat" })

    if (error) {
      return { tool: "create_memo", summary: "메모 생성 실패", data: { created: false } }
    }

    memoCount.current++
    return {
      tool: "create_memo",
      summary: `메모 생성 완료: "${content.slice(0, 30)}..."`,
      data: { created: true, type: "memo" },
    }
  }
}
```

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `chat-tools.ts`

**Step 3: Commit**

```bash
git add lib/chat-tools.ts
git commit -m "feat: add chat agent tool definitions and handlers"
```

---

### Task 2: Refactor /api/chat route for multi-step agent

**Files:**
- Modify: `app/api/chat/route.ts`

**Step 1: Rewrite the POST handler with tool calling loop**

Replace the entire file with:

```typescript
import { getUser } from "@/lib/supabase/server"
import { generateEmbedding, getOpenAI, MODEL_MAP } from "@/lib/ai"
import { checkUsageLimit } from "@/lib/plans"
import { withLogging } from "@/lib/logger"
import { rateLimit } from "@/lib/rate-limit"
import { validate, chatSchema } from "@/lib/validations"
import { AGENT_TOOLS, executeTool, type ToolResult } from "@/lib/chat-tools"
import { NextRequest, NextResponse } from "next/server"

const MAX_TOOL_STEPS = 2
const TOOL_TIMEOUT_MS = 10_000

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

  // Parallel fetch: todos, projects, recent items (lightweight context)
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

        type ChatMessage = { role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string }
        const messages: ChatMessage[] = [
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
            messages: messages as Parameters<typeof getOpenAI>["0"] extends never ? never : any,
            tools: isLastStep ? undefined : AGENT_TOOLS as any,
            stream: false,
          })

          const choice = completion.choices[0]

          // No tool calls — stream the final response
          if (!choice.message.tool_calls || choice.message.tool_calls.length === 0) {
            // Re-call with streaming for the final answer
            const streamCompletion = await getOpenAI().chat.completions.create({
              model: MODEL_MAP.chat,
              messages: messages as any,
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

            send({ type: "done" })
            controller.close()
            log.success({ sources: allSourceIds.length, toolSteps, streamed: true })
            return
          }

          // Process tool calls
          // Add assistant message with tool_calls to history
          messages.push({
            role: "assistant",
            content: choice.message.content || "",
          })

          for (const toolCall of choice.message.tool_calls) {
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

            send({ type: "tool_result", tool: toolName, summary: result.summary })

            // Add tool result to messages for next LLM call
            messages.push({
              role: "tool",
              content: JSON.stringify(result.data),
              tool_call_id: toolCall.id,
            })
          }

          toolSteps++
        }

        // Fallback: if we hit max steps without a final answer
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
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

**Step 3: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: upgrade chat API to multi-step agent with tool calling"
```

---

### Task 3: Update chat-panel.tsx with step indicators

**Files:**
- Modify: `components/chat-panel.tsx`

**Step 1: Add tool step state and SSE handler updates**

Add new state variables after line 53 (after `const [copiedId, setCopiedId] = useState<string | null>(null)`):

```typescript
const [toolSteps, setToolSteps] = useState<Array<{ tool: string; status: "running" | "done"; summary?: string }>>([])
```

In `handleSend()`, inside the SSE line parsing loop (after `} else if (data.type === "chunk") {`), add handlers for the new event types:

```typescript
} else if (data.type === "tool_start") {
  setToolSteps((prev) => [
    ...prev,
    { tool: data.tool, status: "running" },
  ])
} else if (data.type === "tool_result") {
  setToolSteps((prev) =>
    prev.map((s) =>
      s.tool === data.tool && s.status === "running"
        ? { ...s, status: "done", summary: data.summary }
        : s
    )
  )
```

In the cleanup section after `setStreamingText("")` (at the end of the try block, around line 262), add:

```typescript
setToolSteps([])
```

Also add `setToolSteps([])` in the catch block and in `handleNewChat()`.

**Step 2: Add the step indicator UI component**

Add this helper function before `renderMessages()`:

```typescript
const toolLabels: Record<string, { icon: string; label: string }> = {
  search: { icon: "search", label: "검색 중..." },
  summarize: { icon: "file-text", label: "요약 중..." },
  compare: { icon: "git-compare", label: "비교 분석 중..." },
  create_memo: { icon: "plus", label: "생성 중..." },
}

function renderToolSteps() {
  if (toolSteps.length === 0) return null
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-muted/50 space-y-1.5">
        {toolSteps.map((step, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            {step.status === "running" ? (
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
            ) : (
              <CheckCircle2 className="h-3 w-3 text-green-500" />
            )}
            <span className={step.status === "done" ? "text-muted-foreground/60" : "text-foreground/70"}>
              {step.status === "done" && step.summary
                ? step.summary
                : toolLabels[step.tool]?.label || `${step.tool}...`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 3: Render step indicators in message flow**

In `renderMessages()`, right before the streaming text block (`{streamingText && (`), add:

```typescript
{renderToolSteps()}
```

**Step 4: Add the CheckCircle2 import**

Update the lucide-react import at the top of the file to include `CheckCircle2`:

```typescript
import {
  X,
  Send,
  Plus,
  MessageSquare,
  Loader2,
  ChevronDown,
  ExternalLink,
  ListTodo,
  FileText,
  Copy,
  Check,
  CheckCircle2,
  Trash2,
} from "lucide-react"
```

**Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

**Step 6: Commit**

```bash
git add components/chat-panel.tsx
git commit -m "feat: add tool step indicators to chat panel UI"
```

---

### Task 4: Fix OpenAI message types for tool calling

**Files:**
- Modify: `app/api/chat/route.ts`

The OpenAI SDK requires specific message shapes for tool_calls and tool results. This task ensures the message array properly handles the tool calling protocol.

**Step 1: Update message type and assistant message handling**

In `route.ts`, replace the simple `ChatMessage` type and the tool call handling section to use proper OpenAI types:

```typescript
import OpenAI from "openai"

// Use OpenAI's native message types
type AgentMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam
```

Update the messages array construction and assistant message push to include tool_calls:

```typescript
// When tool_calls exist, push the full assistant message with tool_calls
messages.push({
  role: "assistant",
  content: choice.message.content || "",
  tool_calls: choice.message.tool_calls,
} as AgentMessage)

// Tool results use the "tool" role with tool_call_id
messages.push({
  role: "tool",
  content: JSON.stringify(result.data),
  tool_call_id: toolCall.id,
} as AgentMessage)
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

**Step 3: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "fix: use proper OpenAI message types for tool calling protocol"
```

---

### Task 5: Manual integration test

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Test basic chat (no tools)**

Open browser, navigate to the app, open DL Agent chat.
Send: "안녕하세요"
Expected: Normal streaming response without any tool steps

**Step 3: Test search tool**

Send: "내가 최근에 저장한 React 관련 내용이 뭐가 있어?"
Expected:
- Step indicator: "검색 중..." then "N개 관련 항목 발견"
- Streaming answer referencing found items

**Step 4: Test create_memo tool**

Send: "내일까지 코드 리뷰하기를 할일로 추가해줘"
Expected:
- Step indicator: "생성 중..." then "할 일 생성 완료: ..."
- Confirmation message

**Step 5: Test general conversation (no tools)**

Send: "오늘 날씨 어때?"
Expected: Direct response without tool calls (LLM should not call tools for general questions)

**Step 6: Commit final state**

```bash
git add -A
git commit -m "feat: DL Agent multi-step chat agent with tool calling

- search: semantic search in knowledge base
- summarize: synthesize multiple items
- compare: compare items for differences/connections
- create_memo: create memos/todos from conversation
- Real-time step indicators in chat UI
- Max 2 chaining steps, 10s tool timeout"
```
