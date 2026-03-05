# DL Agent Multi-step Chat Design

## Overview

Upgrade DL Agent from single RAG search to a multi-step agent with intent classification and tool calling using OpenAI function calling.

## Current State

- All queries go through: embedding search → context injection → single LLM response
- SSE streaming for real-time typing effect
- Model: gpt-4.1-mini

## Target State

- LLM selects tools via OpenAI function calling
- Server executes tools, feeds results back to LLM
- Up to 2 chaining steps (tool → response, or tool → tool → response)
- Real-time step indicators via SSE

## Architecture

```
User message
    |
[Step 1] OpenAI function calling (tool selection)
    |
Tool selected?
  |-- Yes -> SSE "tool_start" event
  |          -> Execute tool on server
  |          -> Feed result back to LLM
  |          -> (1 more tool call allowed, max 2 steps)
  |          -> Stream final answer
  |-- No  -> Stream answer directly (same as current)
```

## Tools (Phase 1)

### search
- Description: Semantic search in user's knowledge base
- Parameters: `{ query: string }`
- Implementation: Reuse `match_items` RPC with `generateEmbedding`

### summarize
- Description: Synthesize summary of multiple items
- Parameters: `{ item_ids: string[], focus?: string }`
- Implementation: Fetch items by ID, call LLM with summary prompt

### compare
- Description: Compare 2+ items for differences/commonalities
- Parameters: `{ item_ids: string[], aspect?: string }`
- Implementation: Fetch items by ID, call LLM with comparison prompt

### create_memo
- Description: Create a memo or todo from conversation
- Parameters: `{ type: "memo" | "todo", content: string }`
- Implementation: Insert via existing `/api/items` or `/api/todos` logic

## SSE Event Types

Existing:
- `{ type: "session", session_id, sources }`
- `{ type: "chunk", text }`
- `{ type: "done" }`

New:
- `{ type: "tool_start", tool: string, args: object }`
- `{ type: "tool_result", tool: string, summary: string }`

## File Changes

- `lib/chat-tools.ts` — NEW: Tool definitions + handlers
- `app/api/chat/route.ts` — MODIFY: Multi-step agent logic
- `components/chat-panel.tsx` — MODIFY: Step indicator UI

## Safety Constraints

- Max 2 chaining steps per request
- 10s timeout per tool execution
- create_memo: max 5 per session
- Existing rate limit maintained (10/min)
- Existing daily usage limit maintained
