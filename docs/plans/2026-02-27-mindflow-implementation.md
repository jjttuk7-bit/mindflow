# Mindflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a personal Second Brain web app where users quickly capture text, links, images, and voice memos, with AI auto-tagging.

**Architecture:** Next.js 15 App Router with Supabase backend (PostgreSQL + Storage). Stream feed layout with left sidebar for tags/filters and main area for composer + chronological feed. AI tagging via OpenAI API runs asynchronously after content is saved.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS 4, shadcn/ui, Zustand, Supabase, OpenAI API, Vercel

---

### Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json` (replace existing)
- Create: `next.config.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`

**Step 1: Scaffold Next.js project**

Run from `D:/dump`:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm --yes
```
Expected: Next.js project scaffolded in D:/dump

**Step 2: Verify dev server starts**

```bash
npm run dev
```
Expected: Server starts at localhost:3000, default Next.js page loads

**Step 3: Install core dependencies**

```bash
npm install @supabase/supabase-js zustand openai
npm install -D @types/node
```

**Step 4: Install shadcn/ui**

```bash
npx shadcn@latest init -d
```

**Step 5: Add required shadcn components**

```bash
npx shadcn@latest add button input badge card dialog dropdown-menu scroll-area separator tooltip
```

**Step 6: Commit**

```bash
git init
git add -A
git commit -m "feat: initialize Next.js project with shadcn/ui"
```

---

### Task 2: Supabase Setup & Data Model

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/types.ts`
- Create: `supabase/schema.sql`

**Step 1: Create Supabase type definitions**

```typescript
// lib/supabase/types.ts
export type ContentType = "text" | "link" | "image" | "voice"

export interface Item {
  id: string
  type: ContentType
  content: string
  metadata: LinkMeta | ImageMeta | VoiceMeta | Record<string, never>
  created_at: string
  updated_at: string
  tags?: Tag[]
}

export interface Tag {
  id: string
  name: string
  created_at: string
}

export interface ItemTag {
  item_id: string
  tag_id: string
}

export interface LinkMeta {
  og_title?: string
  og_description?: string
  og_image?: string
}

export interface ImageMeta {
  file_url: string
  file_size: number
  mime_type: string
}

export interface VoiceMeta {
  file_url: string
  duration: number
  transcript?: string
}
```

**Step 2: Create SQL schema file**

```sql
-- supabase/schema.sql
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('text', 'link', 'image', 'voice')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE item_tags (
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);

CREATE INDEX idx_items_type ON items(type);
CREATE INDEX idx_items_created_at ON items(created_at DESC);
CREATE INDEX idx_tags_name ON tags(name);
```

**Step 3: Create Supabase client helpers**

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

```typescript
// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

**Step 4: Create .env.local template**

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

**Step 5: Install Supabase SSR helper**

```bash
npm install @supabase/ssr
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Supabase setup and data model"
```

---

### Task 3: Zustand Store

**Files:**
- Create: `lib/store.ts`

**Step 1: Create the store**

```typescript
// lib/store.ts
import { create } from "zustand"
import { Item, Tag, ContentType } from "@/lib/supabase/types"

interface MindflowStore {
  // Items
  items: Item[]
  setItems: (items: Item[]) => void
  addItem: (item: Item) => void
  updateItem: (id: string, updates: Partial<Item>) => void
  removeItem: (id: string) => void

  // Tags
  tags: Tag[]
  setTags: (tags: Tag[]) => void

  // Filters
  activeFilter: ContentType | "all"
  setActiveFilter: (filter: ContentType | "all") => void
  activeTag: string | null
  setActiveTag: (tag: string | null) => void

  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void
}

export const useStore = create<MindflowStore>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
  addItem: (item) => set((s) => ({ items: [item, ...s.items] })),
  updateItem: (id, updates) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    })),
  removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

  tags: [],
  setTags: (tags) => set({ tags }),

  activeFilter: "all",
  setActiveFilter: (activeFilter) => set({ activeFilter }),
  activeTag: null,
  setActiveTag: (activeTag) => set({ activeTag }),

  searchQuery: "",
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}))
```

**Step 2: Commit**

```bash
git add lib/store.ts
git commit -m "feat: add Zustand store for state management"
```

---

### Task 4: Layout Shell (Sidebar + Main)

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`
- Create: `components/sidebar.tsx`
- Create: `components/main-feed.tsx`

**Step 1: Build the sidebar component**

```typescript
// components/sidebar.tsx
"use client"

import { useStore } from "@/lib/store"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ContentType } from "@/lib/supabase/types"
import { FileText, Link, Image, Mic, Layers } from "lucide-react"

const filters: { label: string; value: ContentType | "all"; icon: React.ReactNode }[] = [
  { label: "All", value: "all", icon: <Layers className="h-4 w-4" /> },
  { label: "Ideas", value: "text", icon: <FileText className="h-4 w-4" /> },
  { label: "Links", value: "link", icon: <Link className="h-4 w-4" /> },
  { label: "Images", value: "image", icon: <Image className="h-4 w-4" /> },
  { label: "Voice", value: "voice", icon: <Mic className="h-4 w-4" /> },
]

export function Sidebar() {
  const { tags, items, activeFilter, setActiveFilter, activeTag, setActiveTag } = useStore()

  const tagCounts = tags.map((tag) => ({
    ...tag,
    count: items.filter((item) => item.tags?.some((t) => t.name === tag.name)).length,
  }))

  return (
    <aside className="w-60 border-r bg-muted/30 flex flex-col h-screen">
      <div className="p-4">
        <h1 className="text-lg font-semibold tracking-tight">Mindflow</h1>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 mb-2">Tags</p>
          {tagCounts.map((tag) => (
            <button
              key={tag.id}
              onClick={() => setActiveTag(activeTag === tag.name ? null : tag.name)}
              className={`w-full flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors ${
                activeTag === tag.name ? "bg-accent text-accent-foreground" : ""
              }`}
            >
              <span>#{tag.name}</span>
              <Badge variant="secondary" className="text-xs">{tag.count}</Badge>
            </button>
          ))}
        </div>
        <Separator className="my-4" />
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 mb-2">Filter</p>
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors ${
                activeFilter === f.value ? "bg-accent text-accent-foreground" : ""
              }`}
            >
              {f.icon}
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </aside>
  )
}
```

**Step 2: Build the main feed shell**

```typescript
// components/main-feed.tsx
"use client"

import { Composer } from "@/components/composer"
import { FeedList } from "@/components/feed-list"

export function MainFeed() {
  return (
    <main className="flex-1 flex flex-col h-screen overflow-hidden">
      <div className="p-6 border-b">
        <Composer />
      </div>
      <div className="flex-1 overflow-y-auto">
        <FeedList />
      </div>
    </main>
  )
}
```

**Step 3: Update app layout and page**

```typescript
// app/layout.tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Mindflow",
  description: "AI-powered personal knowledge manager",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

```typescript
// app/page.tsx
import { Sidebar } from "@/components/sidebar"
import { MainFeed } from "@/components/main-feed"

export default function Home() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <MainFeed />
    </div>
  )
}
```

**Step 4: Install lucide-react icons**

```bash
npm install lucide-react
```

**Step 5: Verify layout renders**

```bash
npm run dev
```
Expected: 2-column layout visible with sidebar and main area

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add layout shell with sidebar and main feed"
```

---

### Task 5: Composer Component

**Files:**
- Create: `components/composer.tsx`

**Step 1: Build the composer**

```typescript
// components/composer.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ContentType } from "@/lib/supabase/types"
import { FileText, Link, Image, Mic } from "lucide-react"

const typeButtons: { type: ContentType; icon: React.ReactNode; label: string }[] = [
  { type: "text", icon: <FileText className="h-4 w-4" />, label: "Text" },
  { type: "link", icon: <Link className="h-4 w-4" />, label: "Link" },
  { type: "image", icon: <Image className="h-4 w-4" />, label: "Image" },
  { type: "voice", icon: <Mic className="h-4 w-4" />, label: "Voice" },
]

export function Composer() {
  const [content, setContent] = useState("")
  const [activeType, setActiveType] = useState<ContentType>("text")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit() {
    if (!content.trim() && activeType === "text") return
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: activeType, content: content.trim() }),
      })
      if (res.ok) {
        setContent("")
        // TODO: refresh feed via store
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What's on your mind?"
        className="w-full min-h-[80px] resize-none rounded-lg border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
        disabled={isSubmitting}
      />
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {typeButtons.map((btn) => (
            <Button
              key={btn.type}
              variant={activeType === btn.type ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveType(btn.type)}
            >
              {btn.icon}
              <span className="ml-1">{btn.label}</span>
            </Button>
          ))}
        </div>
        <Button onClick={handleSubmit} disabled={isSubmitting} size="sm">
          Save
        </Button>
      </div>
    </div>
  )
}
```

**Step 2: Verify composer renders and typing works**

```bash
npm run dev
```
Expected: Composer appears at top of main area with type toggle buttons

**Step 3: Commit**

```bash
git add components/composer.tsx
git commit -m "feat: add composer component with type toggle"
```

---

### Task 6: Feed Card & Feed List

**Files:**
- Create: `components/feed-card.tsx`
- Create: `components/feed-list.tsx`

**Step 1: Build the feed card**

```typescript
// components/feed-card.tsx
"use client"

import { Item } from "@/lib/supabase/types"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { FileText, Link, Image, Mic, Trash2, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

const typeIcons: Record<string, React.ReactNode> = {
  text: <FileText className="h-4 w-4 text-blue-500" />,
  link: <Link className="h-4 w-4 text-green-500" />,
  image: <Image className="h-4 w-4 text-purple-500" />,
  voice: <Mic className="h-4 w-4 text-orange-500" />,
}

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function FeedCard({ item, onDelete }: { item: Item; onDelete: (id: string) => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <Card
      className="p-4 hover:bg-muted/50 transition-colors"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{typeIcons[item.type]}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm whitespace-pre-wrap break-words">{item.content}</p>
          <div className="flex items-center gap-2 mt-2">
            {item.tags?.map((tag) => (
              <Badge key={tag.id} variant="secondary" className="text-xs">
                #{tag.name}
              </Badge>
            ))}
            {item.tags?.length === 0 && (
              <span className="text-xs text-muted-foreground italic">Analyzing...</span>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {timeAgo(item.created_at)}
            </span>
          </div>
        </div>
        {hovered && (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(item.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}
```

**Step 2: Build the feed list**

```typescript
// components/feed-list.tsx
"use client"

import { useStore } from "@/lib/store"
import { FeedCard } from "@/components/feed-card"

export function FeedList() {
  const { items, activeFilter, activeTag, removeItem } = useStore()

  const filtered = items.filter((item) => {
    if (activeFilter !== "all" && item.type !== activeFilter) return false
    if (activeTag && !item.tags?.some((t) => t.name === activeTag)) return false
    return true
  })

  async function handleDelete(id: string) {
    await fetch(`/api/items/${id}`, { method: "DELETE" })
    removeItem(id)
  }

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No items yet. Start capturing your thoughts!
      </div>
    )
  }

  return (
    <div className="p-6 space-y-3">
      {filtered.map((item) => (
        <FeedCard key={item.id} item={item} onDelete={handleDelete} />
      ))}
    </div>
  )
}
```

**Step 3: Verify feed renders empty state**

```bash
npm run dev
```
Expected: Empty state message "No items yet" visible

**Step 4: Commit**

```bash
git add components/feed-card.tsx components/feed-list.tsx
git commit -m "feat: add feed card and feed list components"
```

---

### Task 7: API Routes (CRUD)

**Files:**
- Create: `app/api/items/route.ts`
- Create: `app/api/items/[id]/route.ts`

**Step 1: Create items API route (POST + GET)**

```typescript
// app/api/items/route.ts
import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()
  const { type, content, metadata = {} } = body

  const { data: item, error } = await supabase
    .from("items")
    .insert({ type, content, metadata })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Trigger async AI tagging (fire and forget)
  fetch(`${req.nextUrl.origin}/api/ai/tag`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item_id: item.id, content, type }),
  }).catch(() => {})

  return NextResponse.json(item, { status: 201 })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = req.nextUrl
  const type = searchParams.get("type")
  const tag = searchParams.get("tag")
  const limit = parseInt(searchParams.get("limit") || "50")
  const offset = parseInt(searchParams.get("offset") || "0")

  let query = supabase
    .from("items")
    .select("*, item_tags(tag_id, tags(*))")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (type && type !== "all") {
    query = query.eq("type", type)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Flatten tags
  const items = data.map((item: any) => ({
    ...item,
    tags: item.item_tags?.map((it: any) => it.tags).filter(Boolean) || [],
    item_tags: undefined,
  }))

  return NextResponse.json(items)
}
```

**Step 2: Create single item API route (PATCH + DELETE)**

```typescript
// app/api/items/[id]/route.ts
import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from("items")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { error } = await supabase.from("items").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
```

**Step 3: Commit**

```bash
git add app/api/
git commit -m "feat: add CRUD API routes for items"
```

---

### Task 8: AI Tagging API

**Files:**
- Create: `app/api/ai/tag/route.ts`
- Create: `lib/ai.ts`

**Step 1: Create AI helper**

```typescript
// lib/ai.ts
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generateTags(content: string, type: string, existingTags: string[]): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a tagging assistant. Given content, return 1-3 relevant tags as a JSON array of strings.
Prefer reusing existing tags when appropriate: [${existingTags.join(", ")}].
Only create new tags when none of the existing tags fit.
Tags should be lowercase, single-word or hyphenated (e.g., "web-dev", "design", "meeting").
Content type: ${type}.
Return ONLY a JSON array, nothing else.`,
      },
      { role: "user", content },
    ],
    temperature: 0.3,
    max_tokens: 100,
  })

  const text = response.choices[0]?.message?.content?.trim() || "[]"
  try {
    return JSON.parse(text)
  } catch {
    return []
  }
}
```

**Step 2: Create AI tag API route**

```typescript
// app/api/ai/tag/route.ts
import { createClient } from "@/lib/supabase/server"
import { generateTags } from "@/lib/ai"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { item_id, content, type } = await req.json()

  // Get existing tags for reuse
  const { data: existingTags } = await supabase.from("tags").select("name")
  const tagNames = existingTags?.map((t) => t.name) || []

  // Generate tags via AI
  const suggestedTags = await generateTags(content, type, tagNames)

  // Upsert tags and create relations
  for (const tagName of suggestedTags) {
    // Upsert tag
    const { data: tag } = await supabase
      .from("tags")
      .upsert({ name: tagName }, { onConflict: "name" })
      .select()
      .single()

    if (tag) {
      // Create item-tag relation
      await supabase
        .from("item_tags")
        .upsert({ item_id, tag_id: tag.id }, { onConflict: "item_id,tag_id" })
    }
  }

  return NextResponse.json({ tags: suggestedTags })
}
```

**Step 3: Commit**

```bash
git add lib/ai.ts app/api/ai/
git commit -m "feat: add AI auto-tagging with OpenAI"
```

---

### Task 9: Wire Everything Together

**Files:**
- Create: `hooks/use-items.ts`
- Modify: `components/composer.tsx`
- Modify: `app/page.tsx`

**Step 1: Create data fetching hook**

```typescript
// hooks/use-items.ts
"use client"

import { useEffect, useCallback } from "react"
import { useStore } from "@/lib/store"

export function useItems() {
  const { setItems, setTags, activeFilter, activeTag } = useStore()

  const fetchItems = useCallback(async () => {
    const params = new URLSearchParams()
    if (activeFilter !== "all") params.set("type", activeFilter)
    if (activeTag) params.set("tag", activeTag)

    const res = await fetch(`/api/items?${params}`)
    if (res.ok) {
      const data = await res.json()
      setItems(data)
    }
  }, [activeFilter, activeTag, setItems])

  const fetchTags = useCallback(async () => {
    const res = await fetch("/api/tags")
    if (res.ok) {
      const data = await res.json()
      setTags(data)
    }
  }, [setTags])

  useEffect(() => {
    fetchItems()
    fetchTags()
  }, [fetchItems, fetchTags])

  return { refetch: () => { fetchItems(); fetchTags() } }
}
```

**Step 2: Create tags API route**

```typescript
// app/api/tags/route.ts
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase.from("tags").select("*").order("name")
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
```

**Step 3: Update page to use hook and wire composer**

Update `app/page.tsx` to use `useItems` hook and pass `refetch` to composer.

**Step 4: Verify full flow works end-to-end**

```bash
npm run dev
```
Expected: Type text -> save -> appears in feed -> AI tags appear after a moment

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: wire up data fetching and complete CRUD flow"
```

---

### Task 10: Search (Cmd+K)

**Files:**
- Create: `components/search-dialog.tsx`
- Modify: `app/page.tsx`

**Step 1: Build search dialog with Cmd+K shortcut**

Use shadcn `Dialog` component. Listen for Cmd+K keyboard shortcut globally. Filter items by content text match on the client side.

**Step 2: Verify Cmd+K opens search and filters items**

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Cmd+K search dialog"
```

---

## Summary

| Task | Description | Est. Steps |
|------|-------------|------------|
| 1 | Initialize Next.js project | 6 |
| 2 | Supabase setup & data model | 6 |
| 3 | Zustand store | 2 |
| 4 | Layout shell (sidebar + main) | 6 |
| 5 | Composer component | 3 |
| 6 | Feed card & feed list | 4 |
| 7 | API routes (CRUD) | 3 |
| 8 | AI tagging API | 3 |
| 9 | Wire everything together | 5 |
| 10 | Search (Cmd+K) | 3 |
