# Mindflow MVP+ Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade Mindflow from a personal knowledge tool into a Freemium SaaS with Telegram bot, auto-structuring (projects/smart folders/timeline), execution output (TODO/export/AI chat), monthly insight reports, and Stripe billing.

**Architecture:** Next.js monolith extension — all new features built into the existing Next.js 16 + Supabase + Gemini AI codebase. No service separation.

**Tech Stack:** Next.js 16, React 19, Supabase (Auth + DB + Storage), Google Gemini AI, Stripe, Zustand, Tailwind CSS 4, Recharts, Telegram Bot API

**Design Doc:** `docs/plans/2026-02-28-mindflow-mvp-upgrade-design.md`

---

## Phase 1: Database & Foundation

### Task 1: Database Migrations — New Tables

**Files:**
- Create: `supabase/migrations/20260228_001_add_projects.sql`
- Create: `supabase/migrations/20260228_002_add_todos.sql`
- Create: `supabase/migrations/20260228_003_add_chat.sql`
- Create: `supabase/migrations/20260228_004_add_insights.sql`
- Create: `supabase/migrations/20260228_005_add_user_settings.sql`
- Create: `supabase/migrations/20260228_006_extend_items.sql`

**Step 1: Create projects table migration**

```sql
-- supabase/migrations/20260228_001_add_projects.sql
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  color text not null default '#8B7355',
  is_auto boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table projects enable row level security;
create policy "Users can manage own projects" on projects
  for all using (auth.uid() = user_id);
create index idx_projects_user_id on projects(user_id);
```

**Step 2: Create todos table migration**

```sql
-- supabase/migrations/20260228_002_add_todos.sql
create table todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  item_id uuid references items(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  content text not null,
  is_completed boolean not null default false,
  due_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table todos enable row level security;
create policy "Users can manage own todos" on todos
  for all using (auth.uid() = user_id);
create index idx_todos_user_id on todos(user_id);
create index idx_todos_item_id on todos(item_id);
create index idx_todos_project_id on todos(project_id);
```

**Step 3: Create chat tables migration**

```sql
-- supabase/migrations/20260228_003_add_chat.sql
create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'New Chat',
  created_at timestamptz not null default now()
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb,
  created_at timestamptz not null default now()
);

alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
create policy "Users can manage own chat sessions" on chat_sessions
  for all using (auth.uid() = user_id);
create policy "Users can manage own chat messages" on chat_messages
  for all using (
    session_id in (select id from chat_sessions where user_id = auth.uid())
  );
create index idx_chat_sessions_user_id on chat_sessions(user_id);
create index idx_chat_messages_session_id on chat_messages(session_id);
```

**Step 4: Create insight_reports migration**

```sql
-- supabase/migrations/20260228_004_add_insights.sql
create table insight_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  month date not null,
  report_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique(user_id, month)
);

alter table insight_reports enable row level security;
create policy "Users can read own reports" on insight_reports
  for all using (auth.uid() = user_id);
create index idx_insight_reports_user_id on insight_reports(user_id);
```

**Step 5: Create user_settings migration**

```sql
-- supabase/migrations/20260228_005_add_user_settings.sql
create table user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id text,
  stripe_subscription_id text,
  telegram_chat_id text,
  telegram_linked_at timestamptz,
  preferences jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_settings enable row level security;
create policy "Users can manage own settings" on user_settings
  for all using (auth.uid() = user_id);

-- Auto-create settings row for new users
create or replace function create_user_settings()
returns trigger as $$
begin
  insert into user_settings (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function create_user_settings();
```

**Step 6: Extend items table**

```sql
-- supabase/migrations/20260228_006_extend_items.sql
alter table items add column if not exists project_id uuid references projects(id) on delete set null;
alter table items add column if not exists context jsonb;
alter table items add column if not exists source text not null default 'web';

create index idx_items_project_id on items(project_id);
create index idx_items_source on items(source);
```

**Step 7: Run all migrations**

Run: `npx supabase db push` (or apply via Supabase dashboard SQL editor)

**Step 8: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add database migrations for MVP+ upgrade (projects, todos, chat, insights, settings)"
```

---

### Task 2: Update TypeScript Types

**Files:**
- Modify: `lib/supabase/types.ts`

**Step 1: Add new types**

Add the following to `lib/supabase/types.ts` after the existing types:

```typescript
export interface Project {
  id: string
  user_id: string
  name: string
  description?: string | null
  color: string
  is_auto: boolean
  created_at: string
  updated_at: string
}

export interface Todo {
  id: string
  user_id: string
  item_id?: string | null
  project_id?: string | null
  content: string
  is_completed: boolean
  due_date?: string | null
  created_at: string
  updated_at: string
}

export interface ChatSession {
  id: string
  user_id: string
  title: string
  created_at: string
}

export interface ChatMessage {
  id: string
  session_id: string
  role: "user" | "assistant"
  content: string
  sources?: string[] | null
  created_at: string
}

export interface InsightReport {
  id: string
  user_id: string
  month: string
  report_data: InsightReportData
  created_at: string
}

export interface InsightReportData {
  stats: {
    total_captures: number
    by_type: Record<string, number>
    by_source: Record<string, number>
    daily_heatmap: Record<string, number>
    top_projects: string[]
    todos: { completed: number; pending: number }
  }
  interests: {
    top_topics: string[]
    trending_up: string[]
    trending_down: string[]
    summary: string
  }
  reminders: {
    unread_links: number
    overdue_todos: number
    stale_pins: number
    items: Array<{ id: string; title: string; age_days: number }>
  }
  digest: {
    one_liner: string
    key_insights: string[]
    full_summary: string
  }
}

export interface UserSettings {
  id: string
  user_id: string
  plan: "free" | "pro"
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  telegram_chat_id?: string | null
  telegram_linked_at?: string | null
  preferences: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type ItemSource = "web" | "telegram" | "api"
```

**Step 2: Update Item interface** to include new fields:

```typescript
export interface Item {
  id: string
  type: ContentType
  content: string
  summary?: string | null
  is_pinned?: boolean
  is_archived?: boolean
  user_id?: string
  project_id?: string | null        // NEW
  context?: ItemContext | null       // NEW
  source?: ItemSource               // NEW
  metadata: LinkMeta | ImageMeta | VoiceMeta | Record<string, never>
  created_at: string
  updated_at: string
  tags?: Tag[]
}

export interface ItemContext {
  source: string
  time_of_day: string
  day_of_week: string
  topic_cluster?: string
}
```

**Step 3: Commit**

```bash
git add lib/supabase/types.ts
git commit -m "feat: add TypeScript types for projects, todos, chat, insights, settings"
```

---

### Task 3: Freemium Gating Utility

**Files:**
- Create: `lib/plans.ts`

**Step 1: Create the plan limits and check utility**

```typescript
// lib/plans.ts
import { createClient } from "@/lib/supabase/server"

export const PLAN_LIMITS = {
  free: {
    telegram_captures_per_month: 30,
    semantic_search_per_day: 5,
    projects: 3,
    smart_folders: 2,
    ai_export_per_month: 3,
    ai_chat_per_day: 5,
    todo_auto_extract: false,
    ai_project_classification: false,
    insight_ai_analysis: false,
    telegram_notifications: false,
  },
  pro: {
    telegram_captures_per_month: Infinity,
    semantic_search_per_day: Infinity,
    projects: Infinity,
    smart_folders: Infinity,
    ai_export_per_month: Infinity,
    ai_chat_per_day: Infinity,
    todo_auto_extract: true,
    ai_project_classification: true,
    insight_ai_analysis: true,
    telegram_notifications: true,
  },
} as const

export type PlanType = keyof typeof PLAN_LIMITS

export async function getUserPlan(userId: string): Promise<PlanType> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("user_settings")
    .select("plan")
    .eq("user_id", userId)
    .single()
  return (data?.plan as PlanType) || "free"
}

export async function checkUsageLimit(
  userId: string,
  feature: string,
  table: string,
  dateFilter: "day" | "month"
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const plan = await getUserPlan(userId)
  const limit = PLAN_LIMITS[plan][feature as keyof (typeof PLAN_LIMITS)["free"]] as number

  if (limit === Infinity) return { allowed: true, used: 0, limit }

  const supabase = await createClient()
  const now = new Date()
  let startDate: string

  if (dateFilter === "day") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  }

  const { count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startDate)

  const used = count || 0
  return { allowed: used < limit, used, limit }
}
```

**Step 2: Commit**

```bash
git add lib/plans.ts
git commit -m "feat: add Freemium plan limits and usage checking utility"
```

---

### Task 4: User Settings API

**Files:**
- Create: `app/api/settings/route.ts`

**Step 1: Create settings GET and PATCH endpoints**

```typescript
// app/api/settings/route.ts
import { getUser } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (error) {
    // Auto-create if missing
    const { data: created, error: createErr } = await supabase
      .from("user_settings")
      .insert({ user_id: user.id })
      .select()
      .single()
    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 })
    return NextResponse.json(created)
  }

  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const updates = await req.json()
  // Only allow updating preferences (not plan — that's done via Stripe webhook)
  const allowed = { preferences: updates.preferences }

  const { data, error } = await supabase
    .from("user_settings")
    .update({ ...allowed, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
```

**Step 2: Commit**

```bash
git add app/api/settings/route.ts
git commit -m "feat: add user settings API (GET/PATCH)"
```

---

## Phase 2: Projects & Auto-Structuring

### Task 5: Projects CRUD API

**Files:**
- Create: `app/api/projects/route.ts`
- Create: `app/api/projects/[id]/route.ts`

**Step 1: Create projects list/create endpoint**

```typescript
// app/api/projects/route.ts
import { getUser } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { PLAN_LIMITS, getUserPlan } from "@/lib/plans"

export async function GET() {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("projects")
    .select("*, items(count)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const plan = await getUserPlan(user.id)
  const limit = PLAN_LIMITS[plan].projects

  if (limit !== Infinity) {
    const { count } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
    if ((count || 0) >= limit) {
      return NextResponse.json(
        { error: "Project limit reached. Upgrade to Pro for unlimited projects." },
        { status: 403 }
      )
    }
  }

  const { name, color, description } = await req.json()
  const { data, error } = await supabase
    .from("projects")
    .insert({ user_id: user.id, name, color: color || "#8B7355", description, is_auto: false })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
```

**Step 2: Create project update/delete endpoint**

```typescript
// app/api/projects/[id]/route.ts
import { getUser } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const updates = await req.json()

  const { data, error } = await supabase
    .from("projects")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  // Unlink items from this project first
  await supabase.from("items").update({ project_id: null }).eq("project_id", id)

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
```

**Step 3: Commit**

```bash
git add app/api/projects/
git commit -m "feat: add projects CRUD API with Freemium limits"
```

---

### Task 6: AI Project Classification

**Files:**
- Modify: `lib/ai.ts` — add `classifyProject()` and `extractTodos()`
- Modify: `app/api/ai/tag/route.ts` — add project classification + TODO extraction to pipeline

**Step 1: Add AI functions to `lib/ai.ts`**

Append to `lib/ai.ts`:

```typescript
export async function classifyProject(
  content: string,
  type: string,
  existingProjects: Array<{ id: string; name: string; description?: string | null }>
): Promise<{ action: "existing"; project_id: string } | { action: "new"; name: string } | { action: "none" }> {
  if (existingProjects.length === 0) {
    // No existing projects — ask AI if this warrants a new one
    const model = getGenAI().getGenerativeModel({ model: "gemini-2.0-flash" })
    const result = await model.generateContent(
      `Given this content, should it belong to a project/topic? If yes, suggest a short project name (2-3 words max). If it's too generic or trivial, say none.
Return JSON only: {"action":"new","name":"Project Name"} or {"action":"none"}

Content type: ${type}
Content: ${content}`
    )
    try {
      return JSON.parse(result.response.text().trim())
    } catch {
      return { action: "none" }
    }
  }

  const projectList = existingProjects.map((p) => `- ${p.name} (id: ${p.id})${p.description ? `: ${p.description}` : ""}`).join("\n")

  const model = getGenAI().getGenerativeModel({ model: "gemini-2.0-flash" })
  const result = await model.generateContent(
    `Given this content, which project does it belong to? Choose from existing projects or suggest a new one. If it doesn't fit any project, say none.
Return JSON only: {"action":"existing","project_id":"<id>"} or {"action":"new","name":"Short Name"} or {"action":"none"}

Existing projects:
${projectList}

Content type: ${type}
Content: ${content}`
  )
  try {
    return JSON.parse(result.response.text().trim())
  } catch {
    return { action: "none" }
  }
}

export async function extractTodos(content: string): Promise<string[]> {
  const model = getGenAI().getGenerativeModel({ model: "gemini-2.0-flash" })
  const result = await model.generateContent(
    `Extract actionable TODO items from this content. Only extract clear, specific action items.
If there are no actionable items, return an empty array.
Return ONLY a JSON array of strings, nothing else.

Content: ${content}`
  )
  try {
    const parsed = JSON.parse(result.response.text().trim())
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
```

**Step 2: Update `app/api/ai/tag/route.ts`** to add project classification + TODO extraction

After the existing tagging/summary/embedding logic, add:

```typescript
// After updating item with summary and embedding...

// --- Project classification (Pro only) ---
const { data: settings } = await supabase
  .from("user_settings")
  .select("plan")
  .eq("user_id", user.id)
  .single()

const isPro = settings?.plan === "pro"

if (isPro) {
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, description")
    .eq("user_id", user.id)

  const classification = await classifyProject(content, type, projects || [])

  if (classification.action === "existing") {
    await supabase.from("items").update({ project_id: classification.project_id }).eq("id", item_id)
  } else if (classification.action === "new") {
    const { data: newProject } = await supabase
      .from("projects")
      .insert({ user_id: user.id, name: classification.name, is_auto: true })
      .select()
      .single()
    if (newProject) {
      await supabase.from("items").update({ project_id: newProject.id }).eq("id", item_id)
    }
  }
}

// --- TODO extraction (Pro only) ---
if (isPro) {
  const todos = await extractTodos(content)
  if (todos.length > 0) {
    const todoRows = todos.map((t) => ({
      user_id: user.id,
      item_id: item_id,
      content: t,
    }))
    await supabase.from("todos").insert(todoRows)
  }
}

// --- Context generation ---
const now = new Date()
const hours = now.getHours()
const timeOfDay = hours < 6 ? "night" : hours < 12 ? "morning" : hours < 18 ? "afternoon" : "evening"
const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]

await supabase.from("items").update({
  context: {
    source: "web",
    time_of_day: timeOfDay,
    day_of_week: days[now.getDay()],
  },
}).eq("id", item_id)
```

**Step 3: Add imports** at the top of `app/api/ai/tag/route.ts`:

```typescript
import { generateTags, generateSummary, generateEmbedding, classifyProject, extractTodos } from "@/lib/ai"
```

**Step 4: Commit**

```bash
git add lib/ai.ts app/api/ai/tag/route.ts
git commit -m "feat: add AI project classification and TODO extraction to tagging pipeline"
```

---

### Task 7: Todos CRUD API

**Files:**
- Create: `app/api/todos/route.ts`
- Create: `app/api/todos/[id]/route.ts`

**Step 1: Create todos list/create endpoint**

```typescript
// app/api/todos/route.ts
import { getUser } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const projectId = searchParams.get("project_id")
  const completed = searchParams.get("completed")

  let query = supabase
    .from("todos")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (projectId) query = query.eq("project_id", projectId)
  if (completed !== null) query = query.eq("is_completed", completed === "true")

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { content, project_id, item_id, due_date } = await req.json()

  const { data, error } = await supabase
    .from("todos")
    .insert({ user_id: user.id, content, project_id, item_id, due_date })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
```

**Step 2: Create todo update/delete endpoint**

```typescript
// app/api/todos/[id]/route.ts
import { getUser } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const updates = await req.json()

  const { data, error } = await supabase
    .from("todos")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { error } = await supabase.from("todos").delete().eq("id", id).eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
```

**Step 3: Commit**

```bash
git add app/api/todos/
git commit -m "feat: add todos CRUD API"
```

---

### Task 8: Update Zustand Store

**Files:**
- Modify: `lib/store.ts`

**Step 1: Add projects, todos, and new view states to the store**

Extend the `MindflowStore` interface and implementation in `lib/store.ts`:

```typescript
import { Item, Tag, ContentType, Project, Todo } from "@/lib/supabase/types"

export type SortBy = "newest" | "oldest" | "type"
export type ViewMode = "list" | "timeline"
export type SidebarView = "feed" | "todos" | "insights"

interface MindflowStore {
  // ... existing items/tags/filter state ...

  // Projects
  projects: Project[]
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  removeProject: (id: string) => void
  activeProject: string | null
  setActiveProject: (id: string | null) => void

  // Todos
  todos: Todo[]
  setTodos: (todos: Todo[]) => void
  addTodo: (todo: Todo) => void
  updateTodo: (id: string, updates: Partial<Todo>) => void
  removeTodo: (id: string) => void

  // View
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  sidebarView: SidebarView
  setSidebarView: (view: SidebarView) => void

  // Chat
  chatOpen: boolean
  setChatOpen: (open: boolean) => void
}
```

Add corresponding `create` entries for each new state slice. Follow the existing pattern (e.g., `addItem` → `addProject`).

**Step 2: Commit**

```bash
git add lib/store.ts
git commit -m "feat: extend Zustand store with projects, todos, view modes, chat state"
```

---

### Task 9: Projects UI — Sidebar Section

**Files:**
- Modify: `components/sidebar.tsx` — add Projects section, TODO link, Insights link
- Create: `hooks/use-projects.ts` — fetch projects on mount
- Create: `hooks/use-todos.ts` — fetch todos on mount

**Step 1: Create `hooks/use-projects.ts`**

```typescript
import { useEffect } from "react"
import { useStore } from "@/lib/store"

export function useProjects() {
  const { setProjects } = useStore()

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setProjects(data) })
      .catch(() => {})
  }, [setProjects])
}
```

**Step 2: Create `hooks/use-todos.ts`**

```typescript
import { useEffect } from "react"
import { useStore } from "@/lib/store"

export function useTodos() {
  const { setTodos } = useStore()

  useEffect(() => {
    fetch("/api/todos")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setTodos(data) })
      .catch(() => {})
  }, [setTodos])
}
```

**Step 3: Update `components/sidebar.tsx`**

Add the Projects section between Collections and Type filters. Add TODO and Insights navigation items below Archive. Follow the sidebar redesign from the design doc. Key additions:

- Import `FolderOpen, ListTodo, BarChart3, Settings, Plus` from lucide-react
- Add Projects section with project list + "New project" button
- Add TODO navigation item with pending count badge
- Add Insights navigation item
- Add Settings link

**Step 4: Update `app/page.tsx`** to use new hooks:

```typescript
import { useProjects } from "@/hooks/use-projects"
import { useTodos } from "@/hooks/use-todos"

export default function Home() {
  const { refetch } = useItems()
  useProjects()
  useTodos()
  // ... rest
}
```

**Step 5: Commit**

```bash
git add hooks/use-projects.ts hooks/use-todos.ts components/sidebar.tsx app/page.tsx
git commit -m "feat: add projects and todos to sidebar with data fetching hooks"
```

---

### Task 10: Project Filtering in Feed

**Files:**
- Modify: `components/feed-list.tsx` — filter items by `activeProject`
- Modify: `app/api/items/route.ts` — add `project_id` query param support

**Step 1: Update items GET endpoint** to support `project_id` filter:

In `app/api/items/route.ts`, add after the `type` filter:

```typescript
const projectId = searchParams.get("project_id")
// ...
if (projectId) {
  query = query.eq("project_id", projectId)
}
```

**Step 2: Update feed-list.tsx** to filter by active project from store.

**Step 3: Commit**

```bash
git add components/feed-list.tsx app/api/items/route.ts
git commit -m "feat: add project-based filtering to feed"
```

---

### Task 11: TODO List Component

**Files:**
- Create: `components/todo-list.tsx`

**Step 1: Build TODO list component**

A list component that shows todos grouped by project (or "No project"). Each todo has:
- Checkbox to toggle `is_completed`
- Content text
- Link to source item (if `item_id` exists)
- Delete button
- "Add todo" input at top

Uses store's `todos`, `updateTodo`, `removeTodo`, `addTodo` + API calls to persist.

**Step 2: Integrate into main layout**

When `sidebarView === "todos"`, show `<TodoList />` instead of `<MainFeed />` in `app/page.tsx`.

**Step 3: Commit**

```bash
git add components/todo-list.tsx app/page.tsx
git commit -m "feat: add TODO list view with CRUD operations"
```

---

## Phase 3: AI Chat (RAG)

### Task 12: Chat API

**Files:**
- Create: `app/api/chat/route.ts`
- Create: `app/api/chat/sessions/route.ts`
- Create: `app/api/chat/sessions/[id]/route.ts`

**Step 1: Create chat endpoint (RAG)**

```typescript
// app/api/chat/route.ts
import { getUser } from "@/lib/supabase/server"
import { generateEmbedding } from "@/lib/ai"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { NextRequest, NextResponse } from "next/server"
import { checkUsageLimit } from "@/lib/plans"

export async function POST(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Check daily limit
  const usage = await checkUsageLimit(user.id, "ai_chat_per_day", "chat_messages", "day")
  if (!usage.allowed) {
    return NextResponse.json(
      { error: "Daily AI chat limit reached. Upgrade to Pro for unlimited.", used: usage.used, limit: usage.limit },
      { status: 403 }
    )
  }

  const { message, session_id } = await req.json()

  // Create or get session
  let sessionId = session_id
  if (!sessionId) {
    const { data: session } = await supabase
      .from("chat_sessions")
      .insert({ user_id: user.id, title: message.slice(0, 50) })
      .select()
      .single()
    sessionId = session?.id
  }

  // Save user message
  await supabase.from("chat_messages").insert({
    session_id: sessionId,
    role: "user",
    content: message,
  })

  // RAG: find relevant items
  const embedding = await generateEmbedding(message)
  const { data: relevantItems } = await supabase.rpc("match_items", {
    query_embedding: JSON.stringify(embedding),
    match_threshold: 0.3,
    match_count: 10,
  })

  // Build context
  const context = (relevantItems || [])
    .map((item: { id: string; content: string; summary: string }, i: number) =>
      `[${i + 1}] ${item.summary || item.content.slice(0, 200)}`
    )
    .join("\n")

  const sourceIds = (relevantItems || []).map((item: { id: string }) => item.id)

  // Generate response
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

  const result = await model.generateContent(
    `You are a helpful assistant that answers questions based on the user's personal knowledge base.
Use the following saved items as context to answer the question. Reference items by number [1], [2], etc.
If the context doesn't contain relevant information, say so honestly.
Answer in the same language as the question.

Context from saved items:
${context || "(No relevant items found)"}

User question: ${message}`
  )

  const reply = result.response.text().trim()

  // Save assistant message
  await supabase.from("chat_messages").insert({
    session_id: sessionId,
    role: "assistant",
    content: reply,
    sources: sourceIds,
  })

  return NextResponse.json({
    session_id: sessionId,
    message: reply,
    sources: relevantItems || [],
  })
}
```

**Step 2: Create sessions list endpoint**

```typescript
// app/api/chat/sessions/route.ts
import { getUser } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
```

**Step 3: Create session messages endpoint**

```typescript
// app/api/chat/sessions/[id]/route.ts
import { getUser } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  // Verify ownership
  const { data: session } = await supabase
    .from("chat_sessions")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", id)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
```

**Step 4: Commit**

```bash
git add app/api/chat/
git commit -m "feat: add RAG-based AI chat API with session management"
```

---

### Task 13: Chat Panel UI

**Files:**
- Create: `components/chat-panel.tsx`
- Modify: `app/page.tsx` — add chat panel toggle

**Step 1: Build chat panel component**

Slide-over panel from right side. Contains:
- Session list sidebar (collapsible)
- Message list with user/assistant bubbles
- Source references as clickable chips
- Input bar with send button
- "New chat" button

Uses `chatOpen` from store to show/hide.

**Step 2: Add to `app/page.tsx`**

```typescript
import { ChatPanel } from "@/components/chat-panel"
// In JSX:
<ChatPanel />
```

**Step 3: Commit**

```bash
git add components/chat-panel.tsx app/page.tsx
git commit -m "feat: add AI chat slide-over panel with RAG responses"
```

---

## Phase 4: Telegram Bot

### Task 14: Telegram Webhook Handler

**Files:**
- Create: `app/api/telegram/webhook/route.ts`
- Create: `lib/telegram.ts` — Telegram Bot API helpers

**Step 1: Create Telegram helper utilities**

```typescript
// lib/telegram.ts
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!

export async function sendTelegramMessage(chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  })
}

export async function getTelegramFileUrl(fileId: string): Promise<string> {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`)
  const data = await res.json()
  return `https://api.telegram.org/file/bot${BOT_TOKEN}/${data.result.file_path}`
}

export function verifyTelegramWebhook(secretToken: string, headerToken: string | null): boolean {
  return headerToken === secretToken
}
```

**Step 2: Create webhook handler**

```typescript
// app/api/telegram/webhook/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendTelegramMessage, getTelegramFileUrl, verifyTelegramWebhook } from "@/lib/telegram"

// Use service role key for Telegram (no user cookies)
function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  // Verify webhook secret
  const secret = req.headers.get("x-telegram-bot-api-secret-token")
  if (!verifyTelegramWebhook(process.env.TELEGRAM_WEBHOOK_SECRET!, secret)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const message = body.message
  if (!message) return NextResponse.json({ ok: true })

  const chatId = String(message.chat.id)
  const supabase = getServiceSupabase()

  // Find linked user
  const { data: settings } = await supabase
    .from("user_settings")
    .select("user_id, plan")
    .eq("telegram_chat_id", chatId)
    .single()

  // Handle /start command (account linking)
  if (message.text?.startsWith("/start ")) {
    const token = message.text.split(" ")[1]
    // Token format: user_id encoded — validate and link
    const { data: linkData } = await supabase
      .from("user_settings")
      .select("user_id")
      .eq("preferences->>telegram_link_token", token)
      .single()

    if (linkData) {
      await supabase
        .from("user_settings")
        .update({ telegram_chat_id: chatId, telegram_linked_at: new Date().toISOString() })
        .eq("user_id", linkData.user_id)
      await sendTelegramMessage(chatId, "Account linked successfully! Send me anything to save it.")
      return NextResponse.json({ ok: true })
    }
    await sendTelegramMessage(chatId, "Invalid link token. Please generate a new one from the app.")
    return NextResponse.json({ ok: true })
  }

  if (!settings) {
    await sendTelegramMessage(chatId, "Please link your account first. Go to Mindflow Settings > Telegram.")
    return NextResponse.json({ ok: true })
  }

  const userId = settings.user_id

  // Check monthly capture limit for free users
  if (settings.plan === "free") {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const { count } = await supabase
      .from("items")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("source", "telegram")
      .gte("created_at", startOfMonth)

    if ((count || 0) >= 30) {
      await sendTelegramMessage(chatId, "Monthly Telegram capture limit (30) reached. Upgrade to Pro for unlimited.")
      return NextResponse.json({ ok: true })
    }
  }

  // Process message based on type
  let type = "text"
  let content = message.text || ""
  let metadata: Record<string, unknown> = {}

  // URL detection
  if (message.text && /https?:\/\/\S+/.test(message.text)) {
    type = "link"
    content = message.text.match(/https?:\/\/\S+/)?.[0] || message.text
  }

  // Photo
  if (message.photo) {
    type = "image"
    const photo = message.photo[message.photo.length - 1] // largest size
    const fileUrl = await getTelegramFileUrl(photo.file_id)
    // Download and upload to Supabase Storage
    const fileRes = await fetch(fileUrl)
    const fileBuffer = await fileRes.arrayBuffer()
    const fileName = `${userId}/${Date.now()}.jpg`
    await supabase.storage.from("items-images").upload(fileName, fileBuffer, { contentType: "image/jpeg" })
    const { data: urlData } = supabase.storage.from("items-images").getPublicUrl(fileName)
    metadata = { image_url: urlData.publicUrl }
    content = message.caption || "Image from Telegram"
  }

  // Voice
  if (message.voice) {
    type = "voice"
    const fileUrl = await getTelegramFileUrl(message.voice.file_id)
    const fileRes = await fetch(fileUrl)
    const fileBuffer = await fileRes.arrayBuffer()
    const fileName = `${userId}/${Date.now()}.ogg`
    await supabase.storage.from("items-audio").upload(fileName, fileBuffer, { contentType: "audio/ogg" })
    const { data: urlData } = supabase.storage.from("items-audio").getPublicUrl(fileName)
    metadata = { file_url: urlData.publicUrl, duration: message.voice.duration }
    content = "Voice memo from Telegram"
  }

  // Save item
  const { data: item, error } = await supabase
    .from("items")
    .insert({ user_id: userId, type, content, metadata, source: "telegram" })
    .select()
    .single()

  if (error) {
    await sendTelegramMessage(chatId, "Failed to save. Please try again.")
    return NextResponse.json({ ok: true })
  }

  // Trigger AI tagging (fire and forget via edge function or internal call)
  const origin = req.nextUrl.origin
  fetch(`${origin}/api/ai/tag`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item_id: item.id, content, type, user_id: userId }),
  }).catch(() => {})

  await sendTelegramMessage(chatId, `Saved! (${type})`)
  return NextResponse.json({ ok: true })
}
```

**Step 3: Update middleware** to allow Telegram webhook without auth:

In `lib/supabase/middleware.ts`, add to `isPublicRoute`:

```typescript
request.nextUrl.pathname.startsWith("/api/telegram") ||
```

**Step 4: Commit**

```bash
git add lib/telegram.ts app/api/telegram/ lib/supabase/middleware.ts
git commit -m "feat: add Telegram bot webhook handler with message processing"
```

---

### Task 15: Telegram Account Linking

**Files:**
- Create: `app/api/telegram/link/route.ts`

**Step 1: Create link token generation endpoint**

```typescript
// app/api/telegram/link/route.ts
import { getUser } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { randomBytes } from "crypto"

export async function POST() {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const token = randomBytes(16).toString("hex")

  await supabase
    .from("user_settings")
    .update({
      preferences: { telegram_link_token: token },
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)

  const botUsername = process.env.TELEGRAM_BOT_USERNAME || "MindflowBot"

  return NextResponse.json({
    token,
    link: `https://t.me/${botUsername}?start=${token}`,
  })
}
```

**Step 2: Commit**

```bash
git add app/api/telegram/link/route.ts
git commit -m "feat: add Telegram account linking endpoint"
```

---

### Task 16: Settings Page

**Files:**
- Create: `app/settings/page.tsx`
- Create: `app/settings/layout.tsx`

**Step 1: Create settings layout with tabs**

Settings page with tabs: General, Telegram, Billing. Shows current plan, Telegram link status, and preferences.

**Step 2: Telegram settings tab**

- Shows linked status (linked/unlinked)
- "Link Telegram" button → calls `/api/telegram/link`, shows QR code / deep link
- "Unlink" button

**Step 3: Update middleware** to protect `/settings` route (already covered by default).

**Step 4: Commit**

```bash
git add app/settings/
git commit -m "feat: add settings page with Telegram linking"
```

---

## Phase 5: Export & Insights

### Task 17: AI Summary Export

**Files:**
- Create: `app/api/export/summary/route.ts`
- Modify: `components/export-menu.tsx` — add "AI Summary" option

**Step 1: Create export summary endpoint**

```typescript
// app/api/export/summary/route.ts
import { getUser } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { checkUsageLimit } from "@/lib/plans"

export async function POST(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Check usage limit
  const usage = await checkUsageLimit(user.id, "ai_export_per_month", "items", "month")
  // Use a separate counter table or track in preferences for accurate export counting

  const { item_ids, project_id, tag, depth = "brief" } = await req.json()

  // Fetch items
  let query = supabase.from("items").select("*, item_tags(tag_id, tags(*))").eq("user_id", user.id)

  if (item_ids) query = query.in("id", item_ids)
  else if (project_id) query = query.eq("project_id", project_id)

  const { data: items } = await query
  if (!items?.length) return NextResponse.json({ error: "No items found" }, { status: 400 })

  const content = items
    .map((item: { type: string; content: string; summary?: string }) =>
      `[${item.type}] ${item.summary || item.content}`
    )
    .join("\n\n")

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

  const depthInstruction = depth === "brief"
    ? "Create a concise bullet-point summary."
    : "Create a detailed, well-structured document with sections and paragraphs."

  const result = await model.generateContent(
    `Organize and summarize the following personal notes into a clean Markdown document.
${depthInstruction}
Write in the same language as the content.

Content:
${content}`
  )

  return NextResponse.json({
    markdown: result.response.text().trim(),
    item_count: items.length,
  })
}
```

**Step 2: Update `components/export-menu.tsx`** to add "AI Summary Export" option that opens a dialog with depth selection and triggers the API.

**Step 3: Commit**

```bash
git add app/api/export/summary/route.ts components/export-menu.tsx
git commit -m "feat: add AI-powered summary export with depth options"
```

---

### Task 18: Monthly Insight Cron API

**Files:**
- Create: `app/api/cron/monthly-insight/route.ts`
- Create: `vercel.json` (or update) — add cron schedule

**Step 1: Create monthly insight generation endpoint**

```typescript
// app/api/cron/monthly-insight/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { GoogleGenerativeAI } from "@google/generative-ai"

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getServiceSupabase()

  // Get all users
  const { data: users } = await supabase.from("user_settings").select("user_id, plan")
  if (!users) return NextResponse.json({ error: "No users" }, { status: 400 })

  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
  const monthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}-01`

  for (const userRow of users) {
    const userId = userRow.user_id
    const isPro = userRow.plan === "pro"

    // 1. Activity stats
    const { data: items } = await supabase
      .from("items")
      .select("type, source, created_at, is_pinned")
      .eq("user_id", userId)
      .gte("created_at", lastMonth.toISOString())
      .lte("created_at", lastMonthEnd.toISOString())

    if (!items || items.length === 0) continue

    const byType: Record<string, number> = {}
    const bySource: Record<string, number> = {}
    const dailyHeatmap: Record<string, number> = {}

    for (const item of items) {
      byType[item.type] = (byType[item.type] || 0) + 1
      bySource[item.source || "web"] = (bySource[item.source || "web"] || 0) + 1
      const day = item.created_at.split("T")[0]
      dailyHeatmap[day] = (dailyHeatmap[day] || 0) + 1
    }

    // TODO stats
    const { data: completedTodos } = await supabase
      .from("todos").select("*", { count: "exact", head: true })
      .eq("user_id", userId).eq("is_completed", true)
      .gte("updated_at", lastMonth.toISOString())
    const { data: pendingTodos } = await supabase
      .from("todos").select("*", { count: "exact", head: true })
      .eq("user_id", userId).eq("is_completed", false)

    // Top projects
    const { data: topProjects } = await supabase
      .from("projects")
      .select("name, items(count)")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(3)

    const stats = {
      total_captures: items.length,
      by_type: byType,
      by_source: bySource,
      daily_heatmap: dailyHeatmap,
      top_projects: (topProjects || []).map((p: { name: string }) => p.name),
      todos: {
        completed: (completedTodos as unknown as { count: number })?.count || 0,
        pending: (pendingTodos as unknown as { count: number })?.count || 0,
      },
    }

    // 2-4. AI analysis (Pro only)
    let interests = { top_topics: [] as string[], trending_up: [] as string[], trending_down: [] as string[], summary: "" }
    let digest = { one_liner: "", key_insights: [] as string[], full_summary: "" }

    if (isPro) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

      // Get item contents for analysis
      const { data: fullItems } = await supabase
        .from("items")
        .select("content, summary, type")
        .eq("user_id", userId)
        .gte("created_at", lastMonth.toISOString())
        .lte("created_at", lastMonthEnd.toISOString())
        .limit(100)

      const contentSummary = (fullItems || [])
        .map((i: { summary?: string; content: string }) => i.summary || i.content.slice(0, 100))
        .join("\n")

      const analysisResult = await model.generateContent(
        `Analyze this user's monthly captured notes and provide insights.
Return valid JSON with this structure:
{
  "interests": { "top_topics": ["topic1"], "trending_up": ["topic"], "trending_down": ["topic"], "summary": "Korean text" },
  "digest": { "one_liner": "Korean text", "key_insights": ["insight1"], "full_summary": "Korean text" }
}

Items captured this month:
${contentSummary}`
      )

      try {
        const parsed = JSON.parse(analysisResult.response.text().trim())
        interests = parsed.interests
        digest = parsed.digest
      } catch { /* use defaults */ }
    }

    // 3. Reminders
    const { data: unreadLinks } = await supabase
      .from("items")
      .select("id, content, created_at", { count: "exact" })
      .eq("user_id", userId)
      .eq("type", "link")
      .eq("is_archived", false)
      .lt("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
      .limit(5)

    const reminders = {
      unread_links: unreadLinks?.length || 0,
      overdue_todos: (pendingTodos as unknown as { count: number })?.count || 0,
      stale_pins: items.filter((i) => i.is_pinned).length,
      items: (unreadLinks || []).map((i: { id: string; content: string; created_at: string }) => ({
        id: i.id,
        title: i.content.slice(0, 50),
        age_days: Math.floor((Date.now() - new Date(i.created_at).getTime()) / 86400000),
      })),
    }

    // Save report
    await supabase.from("insight_reports").upsert({
      user_id: userId,
      month: monthStr,
      report_data: { stats, interests, reminders, digest },
    }, { onConflict: "user_id,month" })
  }

  return NextResponse.json({ ok: true, processed: users.length })
}
```

**Step 2: Create/update `vercel.json`** for cron:

```json
{
  "crons": [{
    "path": "/api/cron/monthly-insight",
    "schedule": "0 3 1 * *"
  }]
}
```

**Step 3: Commit**

```bash
git add app/api/cron/ vercel.json
git commit -m "feat: add monthly insight report cron job"
```

---

### Task 19: Insights Page

**Files:**
- Create: `app/insights/page.tsx`
- Create: `components/insight-report.tsx`

**Step 1: Create insights API endpoints**

```typescript
// app/api/insights/route.ts
import { getUser } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("insight_reports")
    .select("id, month, created_at")
    .eq("user_id", user.id)
    .order("month", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
```

**Step 2: Install Recharts**

Run: `npm install recharts`

**Step 3: Create insights page**

`app/insights/page.tsx` — shows list of monthly reports. Clicking a report shows:
- Bar chart of captures by type (Recharts `BarChart`)
- Pie chart of sources (Recharts `PieChart`)
- Heatmap calendar (custom grid component)
- AI interest analysis text (Pro only, grayed out for Free)
- Reminder cards
- Digest section

**Step 4: Commit**

```bash
git add app/insights/ app/api/insights/ components/insight-report.tsx
git commit -m "feat: add insights page with charts and AI analysis"
```

---

## Phase 6: Stripe & Billing

### Task 20: Stripe Integration

**Files:**
- Create: `app/api/stripe/checkout/route.ts`
- Create: `app/api/stripe/webhook/route.ts`
- Create: `app/api/stripe/portal/route.ts`

**Step 1: Install Stripe**

Run: `npm install stripe`

**Step 2: Create checkout session endpoint**

```typescript
// app/api/stripe/checkout/route.ts
import { getUser } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: settings } = await supabase
    .from("user_settings")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single()

  let customerId = settings?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    })
    customerId = customer.id
    await supabase.from("user_settings").update({ stripe_customer_id: customerId }).eq("user_id", user.id)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
    success_url: `${req.nextUrl.origin}/settings?billing=success`,
    cancel_url: `${req.nextUrl.origin}/settings?billing=cancel`,
  })

  return NextResponse.json({ url: session.url })
}
```

**Step 3: Create webhook handler**

```typescript
// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

function getServiceSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      const customerId = session.customer as string
      const subscriptionId = session.subscription as string
      await supabase
        .from("user_settings")
        .update({ plan: "pro", stripe_subscription_id: subscriptionId })
        .eq("stripe_customer_id", customerId)
      break
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string
      await supabase
        .from("user_settings")
        .update({ plan: "free", stripe_subscription_id: null })
        .eq("stripe_customer_id", customerId)
      break
    }
  }

  return NextResponse.json({ received: true })
}
```

**Step 4: Create customer portal endpoint**

```typescript
// app/api/stripe/portal/route.ts
import { getUser } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: settings } = await supabase
    .from("user_settings")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single()

  if (!settings?.stripe_customer_id) {
    return NextResponse.json({ error: "No billing account" }, { status: 400 })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: settings.stripe_customer_id,
    return_url: `${req.nextUrl.origin}/settings`,
  })

  return NextResponse.json({ url: session.url })
}
```

**Step 5: Update middleware** to allow Stripe webhook:

In `lib/supabase/middleware.ts`, add to `isPublicRoute`:

```typescript
request.nextUrl.pathname.startsWith("/api/stripe/webhook") ||
```

**Step 6: Commit**

```bash
git add app/api/stripe/ lib/supabase/middleware.ts
git commit -m "feat: add Stripe billing with checkout, webhook, and customer portal"
```

---

### Task 21: Billing UI in Settings

**Files:**
- Modify: `app/settings/page.tsx` — add billing tab

**Step 1: Add billing section to settings page**

Shows:
- Current plan badge (Free / Pro)
- If Free: "Upgrade to Pro — $9.99/mo" button → calls `/api/stripe/checkout`
- If Pro: "Manage subscription" button → calls `/api/stripe/portal`
- Feature comparison table

**Step 2: Commit**

```bash
git add app/settings/
git commit -m "feat: add billing management to settings page"
```

---

## Phase 7: Final Integration & Polish

### Task 22: Timeline View

**Files:**
- Create: `components/timeline-view.tsx`
- Modify: `components/main-feed.tsx` — add view toggle

**Step 1: Create timeline component**

Groups items by date with date headers. Each item shows context badges (source, time_of_day). Toggle between list/timeline in feed header.

**Step 2: Commit**

```bash
git add components/timeline-view.tsx components/main-feed.tsx
git commit -m "feat: add timeline view with context badges"
```

---

### Task 23: Smart Folders

**Files:**
- Create: `components/smart-folders.tsx`
- Modify: `components/sidebar.tsx` — add smart folders section

**Step 1: Implement smart folders as saved filter presets**

System folders (hardcoded):
- "This Week" → items where `created_at > 7 days ago`
- "Pending TODOs" → redirect to TODO view filtered by `is_completed = false`
- "Pinned" → items where `is_pinned = true`

User-defined folders stored in `user_settings.preferences.smart_folders` as array of filter objects.

**Step 2: Add to sidebar below projects**

**Step 3: Commit**

```bash
git add components/smart-folders.tsx components/sidebar.tsx
git commit -m "feat: add smart folders with system defaults and custom filters"
```

---

### Task 24: Environment Variables & Final Config

**Files:**
- Modify: `.env.local.example` (create if doesn't exist)

**Step 1: Document all required env vars**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google Gemini
GEMINI_API_KEY=

# Telegram Bot
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_WEBHOOK_SECRET=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=

# Cron
CRON_SECRET=
```

**Step 2: Commit**

```bash
git add .env.local.example
git commit -m "docs: add environment variable template for MVP+ features"
```

---

## Summary of All Tasks

| # | Task | Phase | Key Files |
|---|------|-------|-----------|
| 1 | Database Migrations | Foundation | `supabase/migrations/` |
| 2 | TypeScript Types | Foundation | `lib/supabase/types.ts` |
| 3 | Freemium Gating | Foundation | `lib/plans.ts` |
| 4 | User Settings API | Foundation | `app/api/settings/` |
| 5 | Projects CRUD API | Projects | `app/api/projects/` |
| 6 | AI Classification + TODO Extract | Projects | `lib/ai.ts`, `app/api/ai/tag/` |
| 7 | Todos CRUD API | Projects | `app/api/todos/` |
| 8 | Update Zustand Store | Projects | `lib/store.ts` |
| 9 | Projects/Todos Sidebar UI | Projects | `components/sidebar.tsx`, `hooks/` |
| 10 | Project Filtering in Feed | Projects | `components/feed-list.tsx` |
| 11 | TODO List Component | Projects | `components/todo-list.tsx` |
| 12 | Chat API (RAG) | Chat | `app/api/chat/` |
| 13 | Chat Panel UI | Chat | `components/chat-panel.tsx` |
| 14 | Telegram Webhook | Telegram | `app/api/telegram/webhook/` |
| 15 | Telegram Linking | Telegram | `app/api/telegram/link/` |
| 16 | Settings Page | Telegram | `app/settings/` |
| 17 | AI Summary Export | Export | `app/api/export/summary/` |
| 18 | Monthly Insight Cron | Insights | `app/api/cron/` |
| 19 | Insights Page | Insights | `app/insights/` |
| 20 | Stripe Integration | Billing | `app/api/stripe/` |
| 21 | Billing UI | Billing | `app/settings/` |
| 22 | Timeline View | Polish | `components/timeline-view.tsx` |
| 23 | Smart Folders | Polish | `components/smart-folders.tsx` |
| 24 | Env Config | Polish | `.env.local.example` |

**Recommended execution order:** Tasks 1→24 sequentially. Each task builds on the previous.
