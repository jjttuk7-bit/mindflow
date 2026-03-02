# Mindflow AI Brain — 3 Kicks Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** AI가 나를 이해하는 앱 경험을 구축하는 3가지 킬러 기능(Auto-Connect, Proactive Nudge, AI Memory Profile) 구현

**Architecture:** 기존 Gemini 임베딩 + pgvector 인프라 위에 구축. 아이템 저장 시 자동 연결(Kick 3) → 주기적 프로필 분석(Kick 1) → 연결/프로필 기반 선제 제안(Kick 2) 순서로 시너지 루프 완성.

**Tech Stack:** Next.js 16, Supabase (pgvector), Gemini API, d3-force, recharts, Vercel Cron

---

## Task 1: item_connections 테이블 및 RPC 생성 (Kick 3 인프라)

**Files:**
- Create: `supabase/migrations/20260302_item_connections.sql`

**Step 1: 마이그레이션 SQL 작성**

```sql
-- item_connections 테이블
CREATE TABLE IF NOT EXISTS item_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES items(id) ON DELETE CASCADE,
  target_id UUID REFERENCES items(id) ON DELETE CASCADE,
  similarity FLOAT NOT NULL,
  ai_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_id, target_id)
);

-- RLS 활성화
ALTER TABLE item_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connections"
  ON item_connections FOR SELECT
  USING (
    source_id IN (SELECT id FROM items WHERE user_id = auth.uid())
  );

-- 유사 아이템 찾기 RPC (기존 match_items와 별도 - 연결 생성용)
CREATE OR REPLACE FUNCTION find_similar_items(
  query_embedding vector(768),
  query_item_id UUID,
  match_threshold FLOAT DEFAULT 0.35,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  summary TEXT,
  type TEXT,
  similarity FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.content,
    i.summary,
    i.type,
    1 - (i.embedding <=> query_embedding) AS similarity,
    i.created_at
  FROM items i
  WHERE i.embedding IS NOT NULL
    AND i.id != query_item_id
    AND i.user_id = (SELECT user_id FROM items WHERE id = query_item_id)
    AND 1 - (i.embedding <=> query_embedding) > match_threshold
  ORDER BY i.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

**Step 2: Supabase SQL Editor에서 실행**

Supabase Dashboard > SQL Editor에서 위 SQL 실행.

**Step 3: 커밋**

```bash
git add supabase/migrations/20260302_item_connections.sql
git commit -m "feat: add item_connections table and find_similar_items RPC"
```

---

## Task 2: 저장 시 자동 연결 생성 API (Kick 3 핵심)

**Files:**
- Create: `app/api/ai/connect/route.ts`
- Modify: `app/api/items/route.ts:75-82` (fire-and-forget connect 호출 추가)
- Modify: `lib/supabase/types.ts` (ItemConnection 타입 추가)

**Step 1: ItemConnection 타입 추가**

`lib/supabase/types.ts` 맨 아래에 추가:

```typescript
export interface ItemConnection {
  id: string
  source_id: string
  target_id: string
  similarity: number
  ai_reason?: string | null
  created_at: string
}
```

**Step 2: 자동 연결 API 작성**

`app/api/ai/connect/route.ts`:

```typescript
import { getUser } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { item_id } = await req.json()
    if (!item_id) return NextResponse.json({ error: "item_id required" }, { status: 400 })

    // 해당 아이템의 임베딩 가져오기
    const { data: item } = await supabase
      .from("items")
      .select("id, embedding")
      .eq("id", item_id)
      .single()

    if (!item?.embedding) {
      return NextResponse.json({ connections: [] })
    }

    // 유사 아이템 검색
    const { data: similar } = await supabase.rpc("find_similar_items", {
      query_embedding: item.embedding,
      query_item_id: item_id,
      match_threshold: 0.35,
      match_count: 5,
    })

    if (!similar || similar.length === 0) {
      return NextResponse.json({ connections: [] })
    }

    // 연결 저장 (upsert)
    const connections = similar.map((s: { id: string; similarity: number }) => ({
      source_id: item_id,
      target_id: s.id,
      similarity: s.similarity,
    }))

    await supabase
      .from("item_connections")
      .upsert(connections, { onConflict: "source_id,target_id" })

    return NextResponse.json({ connections: similar })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("Auto-connect error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

**Step 3: items POST에서 connect fire-and-forget 추가**

`app/api/items/route.ts` - 기존 태깅 fire-and-forget 뒤에 추가 (line ~82 이후):

```typescript
  // Trigger async AI auto-connect (fire and forget)
  fetch(`${req.nextUrl.origin}/api/ai/connect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: cookieHeader,
    },
    body: JSON.stringify({ item_id: item.id }),
  }).catch(() => {})
```

**주의**: connect는 임베딩이 생성된 후 실행되어야 함. 태깅 API에서 임베딩이 저장되므로, connect 호출에 2초 딜레이를 주거나, 태깅 API 끝에서 connect를 호출하는 방식을 고려. → 태깅 API(`api/ai/tag/route.ts`) 맨 끝에서 connect를 fire-and-forget하는 것이 더 안정적.

**대안 (권장)**: `app/api/ai/tag/route.ts`의 `log.success` 직전에 connect 호출 추가:

```typescript
    // After embedding is saved, trigger auto-connect
    fetch(`${req.nextUrl.origin}/api/ai/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") || "",
      },
      body: JSON.stringify({ item_id }),
    }).catch(() => {})

    log.success({ tags: suggestedTags.length })
```

**Step 4: 커밋**

```bash
git add lib/supabase/types.ts app/api/ai/connect/route.ts app/api/ai/tag/route.ts
git commit -m "feat: auto-connect items by semantic similarity on save"
```

---

## Task 3: 관련 항목 카드 UI (Kick 3 프론트엔드)

**Files:**
- Create: `components/related-items.tsx`
- Modify: `components/feed-card.tsx` (관련 항목 표시 영역 추가)

**Step 1: RelatedItems 컴포넌트 작성**

`components/related-items.tsx`:

```tsx
"use client"

import { useState, useEffect } from "react"
import { Item } from "@/lib/supabase/types"
import { Link2, FileText, Image, Mic, Sparkles } from "lucide-react"

const typeIcons: Record<string, React.ReactNode> = {
  text: <FileText className="h-3 w-3" />,
  link: <Link2 className="h-3 w-3" />,
  image: <Image className="h-3 w-3" />,
  voice: <Mic className="h-3 w-3" />,
}

interface RelatedItem {
  id: string
  content: string
  summary?: string | null
  type: string
  similarity: number
  created_at: string
}

export function RelatedItems({ itemId, onItemClick }: {
  itemId: string
  onItemClick?: (id: string) => void
}) {
  const [items, setItems] = useState<RelatedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/items/${itemId}/connections`)
      .then((r) => r.json())
      .then((data) => setItems(data.connections || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [itemId])

  if (loading || items.length === 0) return null

  return (
    <div className="mt-3 pt-3 border-t border-border/40">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="h-3 w-3 text-primary" />
        <span className="text-xs font-medium text-muted-foreground">관련 항목</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {items.slice(0, 3).map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick?.(item.id)}
            className="flex items-center gap-2 text-left text-xs text-muted-foreground hover:text-foreground rounded-lg px-2 py-1.5 hover:bg-accent/40 transition-colors"
          >
            {typeIcons[item.type]}
            <span className="truncate">
              {item.summary || item.content?.slice(0, 60)}
            </span>
            <span className="ml-auto text-[10px] text-muted-foreground/60 shrink-0">
              {Math.round(item.similarity * 100)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: connections API 엔드포인트 작성**

`app/api/items/[id]/connections/route.ts`:

```typescript
import { getUser } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user } = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const { data: connections } = await supabase
      .from("item_connections")
      .select("target_id, similarity, ai_reason")
      .eq("source_id", id)
      .order("similarity", { ascending: false })
      .limit(5)

    if (!connections || connections.length === 0) {
      return NextResponse.json({ connections: [] })
    }

    const targetIds = connections.map((c) => c.target_id)
    const { data: items } = await supabase
      .from("items")
      .select("id, content, summary, type, created_at")
      .in("id", targetIds)

    const itemMap = new Map((items || []).map((i) => [i.id, i]))
    const result = connections
      .map((c) => {
        const item = itemMap.get(c.target_id)
        if (!item) return null
        return { ...item, similarity: c.similarity }
      })
      .filter(Boolean)

    return NextResponse.json({ connections: result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

**Step 3: 커밋**

```bash
git add components/related-items.tsx app/api/items/[id]/connections/route.ts
git commit -m "feat: add related items card with connection API"
```

---

## Task 4: nudges 테이블 및 Nudge 생성 로직 (Kick 2 인프라)

**Files:**
- Create: `supabase/migrations/20260302_nudges.sql`
- Modify: `lib/supabase/types.ts` (Nudge 타입 추가)
- Create: `app/api/nudges/route.ts`

**Step 1: nudges 테이블 마이그레이션**

```sql
CREATE TABLE IF NOT EXISTS nudges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('connection', 'resurface', 'trend', 'action')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  related_item_ids UUID[] DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE nudges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own nudges"
  ON nudges FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own nudges"
  ON nudges FOR UPDATE USING (user_id = auth.uid());

CREATE INDEX idx_nudges_user_unread ON nudges(user_id, is_read) WHERE NOT is_read;
```

**Step 2: Nudge 타입 추가**

`lib/supabase/types.ts`:

```typescript
export type NudgeType = "connection" | "resurface" | "trend" | "action"

export interface Nudge {
  id: string
  user_id: string
  type: NudgeType
  title: string
  content: string
  related_item_ids: string[]
  is_read: boolean
  created_at: string
}
```

**Step 3: Nudge CRUD API**

`app/api/nudges/route.ts`:

```typescript
import { getUser } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// 읽지 않은 nudge 가져오기
export async function GET() {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data } = await supabase
    .from("nudges")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(5)

  return NextResponse.json(data || [])
}

// nudge 읽음 처리
export async function PATCH(req: NextRequest) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await req.json()
  await supabase
    .from("nudges")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", user.id)

  return NextResponse.json({ ok: true })
}
```

**Step 4: 저장 시 connection nudge 생성**

`app/api/ai/connect/route.ts`에서 연결 발견 시 nudge 생성 추가 — connections 저장 직후:

```typescript
    // 유사도 높은 연결이 있으면 nudge 생성
    const topMatch = similar[0]
    if (topMatch && topMatch.similarity > 0.5) {
      const matchTitle = topMatch.summary || topMatch.content?.slice(0, 40)
      await supabase.from("nudges").insert({
        user_id: user.id,
        type: "connection",
        title: "관련 항목을 발견했어요",
        content: `방금 저장한 항목이 "${matchTitle}"과(와) 연결됩니다.`,
        related_item_ids: [item_id, topMatch.id],
      })
    }
```

**Step 5: 커밋**

```bash
git add supabase/migrations/20260302_nudges.sql lib/supabase/types.ts app/api/nudges/route.ts app/api/ai/connect/route.ts
git commit -m "feat: add nudges table and connection nudge on save"
```

---

## Task 5: Nudge 카드 UI (Kick 2 프론트엔드)

**Files:**
- Create: `components/nudge-card.tsx`
- Modify: `components/dashboard.tsx` (Nudge 카드 영역 추가)

**Step 1: NudgeCard 컴포넌트 작성**

`components/nudge-card.tsx`:

```tsx
"use client"

import { useState, useEffect } from "react"
import { Nudge } from "@/lib/supabase/types"
import { Sparkles, Link2, Clock, TrendingUp, CheckSquare, X } from "lucide-react"

const nudgeIcons: Record<string, React.ReactNode> = {
  connection: <Link2 className="h-4 w-4 text-primary" />,
  resurface: <Clock className="h-4 w-4 text-terracotta" />,
  trend: <TrendingUp className="h-4 w-4 text-sage" />,
  action: <CheckSquare className="h-4 w-4 text-dusty-rose" />,
}

export function NudgeCards() {
  const [nudges, setNudges] = useState<Nudge[]>([])

  useEffect(() => {
    fetch("/api/nudges")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setNudges(data)
      })
      .catch(() => {})
  }, [])

  const dismiss = async (id: string) => {
    setNudges((prev) => prev.filter((n) => n.id !== id))
    await fetch("/api/nudges", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
  }

  if (nudges.length === 0) return null

  return (
    <div className="flex flex-col gap-2 mb-4">
      {nudges.slice(0, 2).map((nudge) => (
        <div
          key={nudge.id}
          className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10"
        >
          <div className="mt-0.5">
            {nudgeIcons[nudge.type] || <Sparkles className="h-4 w-4 text-primary" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{nudge.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{nudge.content}</p>
          </div>
          <button
            onClick={() => dismiss(nudge.id)}
            className="text-muted-foreground/60 hover:text-foreground p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
```

**Step 2: Dashboard에 NudgeCards 추가**

`components/dashboard.tsx`에서 메인 피드 위에 `<NudgeCards />` 삽입. 정확한 위치는 dashboard.tsx의 구조에 따라 결정 — DailyBriefing 아래, MainFeed 위.

**Step 3: 커밋**

```bash
git add components/nudge-card.tsx components/dashboard.tsx
git commit -m "feat: add nudge cards to dashboard"
```

---

## Task 6: AI Memory Profile API (Kick 1 백엔드)

**Files:**
- Create: `app/api/ai/profile/route.ts`
- Create: `supabase/migrations/20260302_ai_profile.sql`

**Step 1: user_settings에 ai_profile 컬럼 추가**

```sql
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ai_profile JSONB DEFAULT '{}';
```

**Step 2: AI Profile 분석/조회 API**

`app/api/ai/profile/route.ts`:

```typescript
import { getUser } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET: 프로필 조회
export async function GET() {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data } = await supabase
    .from("user_settings")
    .select("ai_profile")
    .eq("user_id", user.id)
    .single()

  return NextResponse.json(data?.ai_profile || {})
}

// POST: 프로필 재분석 트리거
export async function POST() {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // 최근 90일 아이템 가져오기
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { data: items } = await supabase
    .from("items")
    .select("id, type, content, summary, context, created_at, item_tags(tags(name))")
    .eq("user_id", user.id)
    .gte("created_at", ninetyDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(200)

  if (!items || items.length < 5) {
    return NextResponse.json({ error: "데이터가 부족합니다 (최소 5개 항목)" }, { status: 400 })
  }

  // 패턴 분석: 요일별, 시간대별 분포
  const dayCount: Record<string, number> = {}
  const hourCount: Record<number, number> = {}
  const typeCount: Record<string, number> = {}
  const tagCount: Record<string, number> = {}

  for (const item of items) {
    const date = new Date(item.created_at)
    const day = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()]
    dayCount[day] = (dayCount[day] || 0) + 1
    hourCount[date.getHours()] = (hourCount[date.getHours()] || 0) + 1
    typeCount[item.type] = (typeCount[item.type] || 0) + 1

    const tags = (item.item_tags as { tags: { name: string } }[]) || []
    for (const t of tags) {
      if (t.tags?.name) tagCount[t.tags.name] = (tagCount[t.tags.name] || 0) + 1
    }
  }

  // 상위 관심사
  const topTags = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ topic: name, count }))

  // 피크 요일/시간
  const peakDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "월"
  const peakHour = Object.entries(hourCount)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || "9"

  // AI로 사고 성향 분석
  const { GoogleGenerativeAI } = await import("@google/generative-ai")
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

  const summaries = items
    .slice(0, 50)
    .map((i) => i.summary || i.content?.slice(0, 80))
    .join("\n")

  const analysisResult = await model.generateContent(
    `사용자가 최근 기록한 내용 요약 목록입니다. 이 사용자의 사고 성향과 관심 분야를 분석해주세요.

${summaries}

JSON만 반환:
{
  "thinking_style": "수렴형/발산형/분석형/실행형 중 하나",
  "style_description": "사고 성향 한 줄 설명 (한국어)",
  "interests_summary": "관심 분야 요약 2~3문장 (한국어)",
  "growth_tip": "지식 관리 팁 한 줄 (한국어)"
}`
  )

  let analysis = { thinking_style: "분석형", style_description: "", interests_summary: "", growth_tip: "" }
  try {
    const text = analysisResult.response.text().trim()
    const match = text.match(/\{[\s\S]*\}/)
    if (match) analysis = JSON.parse(match[0])
  } catch { /* use defaults */ }

  const profile = {
    interests: topTags,
    patterns: {
      peak_day: peakDay,
      peak_hour: parseInt(peakHour),
      avg_daily: Math.round((items.length / 90) * 10) / 10,
      type_distribution: typeCount,
      day_distribution: dayCount,
      hour_distribution: hourCount,
    },
    thinking_style: analysis.thinking_style,
    style_description: analysis.style_description,
    interests_summary: analysis.interests_summary,
    growth_tip: analysis.growth_tip,
    total_items: items.length,
    updated_at: new Date().toISOString(),
  }

  await supabase
    .from("user_settings")
    .update({ ai_profile: profile })
    .eq("user_id", user.id)

  return NextResponse.json(profile)
}
```

**Step 3: 커밋**

```bash
git add supabase/migrations/20260302_ai_profile.sql app/api/ai/profile/route.ts
git commit -m "feat: add AI memory profile analysis API"
```

---

## Task 7: AI Profile 페이지 UI (Kick 1 프론트엔드)

**Files:**
- Create: `app/profile/ai/page.tsx`
- Create: `components/ai-profile.tsx`

**Step 1: AI Profile 컴포넌트 작성**

`components/ai-profile.tsx` — 레이더 차트(관심사), 히트맵(활동 패턴), 텍스트 인사이트 카드 구성.

핵심 섹션:
- **관심사 TOP 10**: 수평 막대 차트 (recharts BarChart)
- **활동 패턴**: 요일 x 시간대 히트맵 (CSS grid + 색상 강도)
- **사고 성향**: 아이콘 + 설명 카드
- **성장 팁**: AI 추천 카드
- **재분석 버튼**: POST /api/ai/profile 호출

**Step 2: 라우트 페이지 작성**

`app/profile/ai/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AIProfile } from "@/components/ai-profile"

export default async function AIProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return <AIProfile />
}
```

**Step 3: 사이드바/메뉴에 AI Profile 링크 추가**

설정 메뉴 또는 사이드바에 "나의 AI 프로필" 링크를 `/profile/ai`로 추가.

**Step 4: 커밋**

```bash
git add components/ai-profile.tsx app/profile/ai/page.tsx
git commit -m "feat: add AI memory profile page with visualizations"
```

---

## Task 8: Knowledge Map AI 연결선 강화 (Kick 3 시각화)

**Files:**
- Modify: `app/api/knowledge-map/route.ts` (AI 연결 데이터 포함)
- Modify: `components/knowledge-map.tsx` (연결선 스타일 분기)

**Step 1: Knowledge Map API에서 item_connections 데이터 조인**

기존 태그 기반 연결 외에 `item_connections` 테이블의 AI 연결도 links에 포함. 유사도에 따라 `type: "ai"` 플래그 추가.

**Step 2: Knowledge Map 컴포넌트에서 AI 연결선 스타일 분기**

- 태그 기반 연결: 기존 실선
- AI 연결(similarity > 0.6): 보라색 실선 + 약간 두꺼운 선
- AI 연결(similarity 0.35~0.6): 보라색 점선

**Step 3: 커밋**

```bash
git add app/api/knowledge-map/route.ts components/knowledge-map.tsx
git commit -m "feat: add AI semantic connections to knowledge map"
```

---

## Task 9: Trend Nudge Cron (Kick 2 주간 트렌드)

**Files:**
- Create: `app/api/cron/weekly-nudge/route.ts`
- Modify: `vercel.json` (cron 스케줄 추가)

**Step 1: 주간 트렌드 Nudge 생성 cron**

`app/api/cron/weekly-nudge/route.ts`:

매주 월요일 실행. 각 사용자의 지난 7일 태그 분포를 분석해 "이번 주 관심사" trend nudge 생성.

**Step 2: vercel.json에 cron 등록**

```json
{
  "crons": [
    { "path": "/api/cron/weekly-nudge", "schedule": "0 9 * * 1" }
  ]
}
```

**Step 3: 커밋**

```bash
git add app/api/cron/weekly-nudge/route.ts vercel.json
git commit -m "feat: add weekly trend nudge cron job"
```

---

## Task 10: Pro 플랜 게이팅 및 통합 테스트

**Files:**
- Modify: `lib/plans.ts` (새 기능 플래그 추가)

**Step 1: plans.ts에 새 기능 플래그 추가**

```typescript
// free 플랜에 추가:
ai_profile: false,
ai_nudges: false,
ai_connections_per_day: 5,

// pro 플랜에 추가:
ai_profile: true,
ai_nudges: true,
ai_connections_per_day: Infinity,
```

**Step 2: 각 API에서 플랜 체크 추가**

- `api/ai/connect`: free는 하루 5회 제한
- `api/ai/profile`: pro only
- `api/nudges`: connection nudge는 free도 가능, trend/resurface는 pro only

**Step 3: 수동 통합 테스트**

1. 아이템 저장 → 관련 항목 카드 표시 확인
2. 저장 후 nudge 카드 표시 확인
3. AI Profile 페이지에서 분석 실행 확인
4. Knowledge Map에서 AI 연결선 표시 확인

**Step 4: 커밋**

```bash
git add lib/plans.ts
git commit -m "feat: gate AI brain features by plan tier"
```

---

## 요약

| Task | Kick | 내용 | 예상 파일 수 |
|------|------|------|-------------|
| 1 | 3 | item_connections 테이블 + RPC | 1 |
| 2 | 3 | 자동 연결 API + items POST 연동 | 3 |
| 3 | 3 | 관련 항목 카드 UI + connections API | 2 |
| 4 | 2 | nudges 테이블 + CRUD API + 연결 nudge | 4 |
| 5 | 2 | Nudge 카드 UI + Dashboard 통합 | 2 |
| 6 | 1 | AI Profile 분석 API + DB | 2 |
| 7 | 1 | AI Profile 페이지 UI | 2 |
| 8 | 3 | Knowledge Map AI 연결선 | 2 |
| 9 | 2 | 주간 트렌드 Nudge Cron | 2 |
| 10 | — | Pro 플랜 게이팅 + 통합 테스트 | 1 |
