import { SupabaseClient } from "@supabase/supabase-js"
import { generateEmbedding, getOpenAI, MODEL_MAP } from "@/lib/ai"
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
]

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
      summary: `할 일 생성 완료: "${content.slice(0, 30)}"`,
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
      summary: `메모 생성 완료: "${content.slice(0, 30)}"`,
      data: { created: true, type: "memo" },
    }
  }
}
