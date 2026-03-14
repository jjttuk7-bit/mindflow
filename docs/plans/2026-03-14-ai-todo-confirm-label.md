# AI Todo 제안 확인 + AI 라벨 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** AI 채팅에서 todo 생성 시 "AI가 할 일을 제안했어요" 토스트(취소 가능)를 표시하고, AI가 만든 todo에 `AI` 뱃지를 보여준다.

**Architecture:** todos 테이블에 `source` 컬럼 추가 → chat-tools에서 todo 생성 시 `source: 'chat'` + ID 반환 → 채팅 UI에서 tool_result 수신 시 토스트 + 취소 → todo-list에서 AI 뱃지 표시.

**Tech Stack:** Supabase (SQL migration), Next.js API routes, React, Zustand, Sonner toast

---

## Task 1: DB 마이그레이션 — todos 테이블에 source 컬럼 추가

**Files:**
- Create: `supabase/migrations/20260314_add_todo_source.sql`
- Modify: `supabase/migration-all.sql`
- Modify: `supabase/schema.sql`

**Step 1: 마이그레이션 SQL 작성**

```sql
-- supabase/migrations/20260314_add_todo_source.sql
ALTER TABLE todos ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
```

**Step 2: migration-all.sql의 todos 테이블 정의에 source 컬럼 추가**

`supabase/migration-all.sql`의 todos CREATE TABLE 문에 다음 컬럼 추가:
```sql
source TEXT DEFAULT 'manual',
```

**Step 3: schema.sql의 todos 테이블 정의에 source 컬럼 추가**

`supabase/schema.sql`의 todos CREATE TABLE 문에 동일하게 추가.

**Step 4: Commit**
```bash
git add supabase/migrations/20260314_add_todo_source.sql supabase/migration-all.sql supabase/schema.sql
git commit -m "feat: add source column to todos table for AI-created tracking"
```

---

## Task 2: TypeScript 타입 + 유효성 검사 업데이트

**Files:**
- Modify: `lib/supabase/types.ts` (Todo 인터페이스, line 110-120)
- Modify: `lib/validations.ts` (todoCreateSchema, line 22-27)

**Step 1: Todo 인터페이스에 source 필드 추가**

`lib/supabase/types.ts`의 Todo 인터페이스 (line 118, `updated_at` 뒤)에 추가:
```ts
source?: "manual" | "chat"
```

**Step 2: todoCreateSchema에 source 필드 추가**

`lib/validations.ts`의 todoCreateSchema (line 22-27)에 추가:
```ts
source: z.enum(["manual", "chat"]).optional().default("manual"),
```

**Step 3: Commit**
```bash
git add lib/supabase/types.ts lib/validations.ts
git commit -m "feat: add source field to Todo type and validation schema"
```

---

## Task 3: chat-tools.ts — todo 생성 시 source:'chat' 저장 + ID 반환

**Files:**
- Modify: `lib/chat-tools.ts` (executeCreateMemo 함수, line 261-306)

**Step 1: todo INSERT에 source 추가 + ID select**

`lib/chat-tools.ts`의 executeCreateMemo 함수에서 todo 생성 부분 (line 276-289)을 수정:

기존:
```ts
const { error } = await supabase
  .from("todos")
  .insert({ content, user_id: userId })
```

변경:
```ts
const { data: newTodo, error } = await supabase
  .from("todos")
  .insert({ content, user_id: userId, source: "chat" })
  .select("id")
  .single()
```

**Step 2: 반환값에 todo_id 추가**

기존:
```ts
return {
  tool: "create_memo",
  summary: `할 일 생성 완료: "${content.slice(0, 30)}"`,
  data: { created: true, type: "todo" },
}
```

변경:
```ts
return {
  tool: "create_memo",
  summary: `할 일 생성 완료: "${content.slice(0, 30)}"`,
  data: { created: true, type: "todo", todo_id: newTodo?.id },
}
```

**Step 3: Commit**
```bash
git add lib/chat-tools.ts
git commit -m "feat: save source='chat' for AI-created todos and return todo_id"
```

---

## Task 4: 채팅 UI — tool_result 수신 시 토스트 + 취소 버튼

**Files:**
- Modify: `components/chat-panel.tsx` (tool_result 핸들러, line 248-255)

**Step 1: tool_result에서 create_memo todo 감지 시 토스트 표시**

`components/chat-panel.tsx`의 `data.type === "tool_result"` 블록 (line 248-255) 뒤에 추가:

```ts
// After updating tool steps, show toast for AI-created todos
if (data.tool === "create_memo" && data.summary?.includes("할 일")) {
  const todoId = data.todo_id
  if (todoId) {
    toast("AI가 할 일을 제안했어요", {
      duration: 5000,
      action: {
        label: "취소",
        onClick: async () => {
          await fetch(`/api/todos/${todoId}`, { method: "DELETE" })
          removeTodo(todoId)
          toast.success("제안이 취소되었습니다")
        },
      },
    })
  }
}
```

**Step 2: tool_result SSE에 todo_id 포함하도록 서버 수정**

`app/api/chat/route.ts`의 tool_result send 부분 (line 267)을 수정:

기존:
```ts
send({ type: "tool_result", tool: toolName, summary: result.summary })
```

변경:
```ts
send({ type: "tool_result", tool: toolName, summary: result.summary, ...( toolName === "create_memo" && result.data && typeof result.data === "object" ? result.data : {}) })
```

이렇게 하면 `todo_id`가 SSE 이벤트에 포함됨.

**Step 3: chat-panel에서 removeTodo import 확인**

`components/chat-panel.tsx` 상단의 useStore에서 `removeTodo`를 가져오도록 확인/추가:

```ts
const { ..., removeTodo } = useStore()
```

**Step 4: Commit**
```bash
git add components/chat-panel.tsx app/api/chat/route.ts
git commit -m "feat: show cancellable toast when AI suggests a todo"
```

---

## Task 5: todo-list.tsx — AI 뱃지 표시

**Files:**
- Modify: `components/todo-list.tsx` (todo 렌더링, line 220-228)

**Step 1: todo content 옆에 AI 뱃지 추가**

`components/todo-list.tsx`의 todo content span (line 220-228) 뒤에 AI 뱃지 추가:

기존:
```tsx
<span className={`flex-1 text-sm ${...}`}>
  {todo.content}
</span>
```

변경:
```tsx
<span className={`flex-1 text-sm ${...}`}>
  {todo.content}
</span>
{todo.source === "chat" && (
  <span className="shrink-0 text-[10px] font-semibold leading-none px-1.5 py-0.5 rounded bg-primary/10 text-primary">
    AI
  </span>
)}
```

**Step 2: Commit**
```bash
git add components/todo-list.tsx
git commit -m "feat: show AI badge on chat-created todos"
```

---

## Task 6: Supabase 마이그레이션 실행

**Step 1: Supabase SQL Editor에서 마이그레이션 실행**

```sql
ALTER TABLE todos ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
```

**Step 2: 확인**

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'todos' AND column_name = 'source';
```

**Step 3: Commit (이미 완료)**
