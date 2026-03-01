# AI Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve AI tagging accuracy and project classification by rewriting prompts with Korean optimization, tag frequency context, few-shot examples, and richer project context.

**Architecture:** Modify two files: `lib/ai.ts` (prompt rewrites for `generateTags` and `classifyProject`) and `app/api/ai/tag/route.ts` (add user-scoped tag frequency query and project item context query). No new API endpoints, no new DB tables, no new dependencies.

**Tech Stack:** Next.js App Router, Google Gemini 2.0 Flash, Supabase (PostgreSQL), TypeScript

**Note:** Related items (Section 2 of design) are already fully implemented — endpoint at `app/api/items/[id]/related/route.ts` and UI in `components/feed-card.tsx`. This plan covers Sections 1 and 3 only.

---

### Task 1: Add user-scoped tag frequency query to `/api/ai/tag`

The current code fetches all tags globally (`supabase.from("tags").select("name")`). We need to fetch only tags the current user has used, with usage counts, so the AI can prefer high-frequency tags.

**Files:**
- Modify: `app/api/ai/tag/route.ts:13-14`

**Step 1: Replace global tag query with user-scoped frequency query**

In `app/api/ai/tag/route.ts`, replace lines 13-14:

```typescript
// OLD:
const { data: existingTags } = await supabase.from("tags").select("name")
const tagNames = existingTags?.map((t) => t.name) || []

// NEW:
const { data: userTagRows } = await supabase
  .from("item_tags")
  .select("tag_id, tags(name), items!inner(user_id)")
  .eq("items.user_id", user.id)

// Count frequency per tag
const tagFreqMap = new Map<string, number>()
for (const row of userTagRows || []) {
  const name = (row.tags as unknown as { name: string })?.name
  if (name) tagFreqMap.set(name, (tagFreqMap.get(name) || 0) + 1)
}
// Sort by frequency descending, format as "tag-name (count)"
const tagNamesWithFreq = [...tagFreqMap.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([name, count]) => `${name} (${count})`)
const tagNames = [...tagFreqMap.keys()]
```

**Step 2: Pass frequency info to `generateTags`**

Update the `generateTags` call (line 18) to also pass frequency info:

```typescript
const [suggestedTags, summary, embedding] = await Promise.all([
  generateTags(content, type, tagNames, tagNamesWithFreq),
  generateSummary(content),
  generateEmbedding(content),
])
```

**Step 3: Verify the app builds**

Run: `npx next build` (or `npm run build`)
Expected: Build will fail because `generateTags` signature changed. That's expected — Task 2 fixes it.

**Step 4: Commit**

```bash
git add app/api/ai/tag/route.ts
git commit -m "feat: add user-scoped tag frequency query to AI tag route"
```

---

### Task 2: Rewrite `generateTags` prompt with Korean optimization

The current prompt is English-only, has no few-shot examples, and doesn't use tag frequency. Rewrite it to handle Korean content natively, include few-shot examples, use frequency-weighted tag suggestions, and enforce strict constraints.

**Files:**
- Modify: `lib/ai.ts:11-39`

**Step 1: Update `generateTags` function signature and prompt**

Replace the entire `generateTags` function (lines 11-39) in `lib/ai.ts`:

```typescript
export async function generateTags(
  content: string,
  type: string,
  existingTags: string[],
  tagFrequencies?: string[]
): Promise<string[]> {
  const model = getGenAI().getGenerativeModel({ model: "gemini-2.0-flash" })

  const freqSection = tagFrequencies?.length
    ? `\n사용자의 기존 태그 (사용 빈도순):\n${tagFrequencies.join(", ")}\n기존 태그를 최대한 재사용하세요. 빈도가 높은 태그를 선호합니다.`
    : existingTags.length
    ? `\n사용자의 기존 태그: ${existingTags.join(", ")}\n기존 태그를 최대한 재사용하세요.`
    : ""

  const prompt = `당신은 콘텐츠 태깅 전문가입니다. 주어진 콘텐츠에 1~3개의 태그를 붙여주세요.

규칙:
- 태그는 소문자, 영문 또는 한글, 단어 1~2개 (예: "web-dev", "회의", "design", "독서")
- 기존 태그가 맞으면 반드시 재사용. 새 태그는 기존 태그가 맞지 않을 때만 생성
- 너무 포괄적인 태그 금지: "일반", "기타", "general", "other", "misc", "stuff", "note"
- 콘텐츠의 핵심 주제/행동을 반영하는 구체적 태그만 사용
- 1~3개만 반환. 애매하면 적게
${freqSection}

콘텐츠 유형: ${type}

좋은 태그 예시:
- "React 컴포넌트 리팩토링 작업" → ["react", "리팩토링"]
- "팀 회의에서 Q3 목표 논의" → ["회의", "목표"]
- "여행 가기 전 짐 싸야 할 것들" → ["여행", "todo"]

나쁜 태그 예시:
- ["general", "note"] ← 너무 포괄적
- ["react", "javascript", "web", "dev", "coding"] ← 너무 많음

JSON 배열만 반환하세요. 다른 텍스트 없이.

콘텐츠: ${content}`

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()
  try {
    const tags = JSON.parse(text)
    return Array.isArray(tags) ? tags.slice(0, 3) : []
  } catch {
    const match = text.match(/\[[\s\S]*\]/)
    if (match) {
      try {
        const tags = JSON.parse(match[0])
        return Array.isArray(tags) ? tags.slice(0, 3) : []
      } catch { /* ignore */ }
    }
    return []
  }
}
```

**Step 2: Verify the app builds**

Run: `npm run build`
Expected: PASS — both `lib/ai.ts` and `app/api/ai/tag/route.ts` now agree on the signature.

**Step 3: Commit**

```bash
git add lib/ai.ts
git commit -m "feat: rewrite generateTags with Korean prompt, frequency, and few-shot examples"
```

---

### Task 3: Add project item context query to `/api/ai/tag`

The current `classifyProject` call only passes project names. We need to include the 3 most recent item summaries per project so the AI understands what each project contains.

**Files:**
- Modify: `app/api/ai/tag/route.ts:62-95`

**Step 1: Enrich project data with recent items**

In `app/api/ai/tag/route.ts`, replace the project classification block (lines 62-95):

```typescript
if (limits.ai_project_classification) {
  try {
    const { data: existingProjects } = await supabase
      .from("projects")
      .select("id, name")
      .eq("user_id", user.id)

    // Fetch 3 most recent items per project for context
    const projectsWithContext = await Promise.all(
      (existingProjects || []).map(async (p) => {
        const { data: recentItems } = await supabase
          .from("items")
          .select("content, summary")
          .eq("project_id", p.id)
          .order("created_at", { ascending: false })
          .limit(3)
        const samples = (recentItems || [])
          .map((i) => i.summary || i.content.slice(0, 80))
        return { id: p.id, name: p.name, samples }
      })
    )

    const classification = await classifyProject(
      content,
      type,
      projectsWithContext
    )

    if (classification.action === "existing") {
      updates.project_id = classification.project_id
    } else if (classification.action === "new") {
      const { data: newProject } = await supabase
        .from("projects")
        .insert({
          name: classification.name,
          color: "#8B7355",
          is_auto: true,
          user_id: user.id,
        })
        .select()
        .single()
      if (newProject) {
        updates.project_id = newProject.id
      }
    }
  } catch (err) {
    console.error("Project classification error:", err)
  }
}
```

**Step 2: Verify the app builds**

Run: `npm run build`
Expected: Build will fail because `classifyProject` signature changed. That's expected — Task 4 fixes it.

**Step 3: Commit**

```bash
git add app/api/ai/tag/route.ts
git commit -m "feat: add project item context to classification query"
```

---

### Task 4: Rewrite `classifyProject` with Korean prompt and richer context

The current prompt is English-only and only receives project names. Rewrite to accept project samples, use Korean prompt, and suppress unnecessary new project creation.

**Files:**
- Modify: `lib/ai.ts:64-105`

**Step 1: Update `classifyProject` function**

Replace the entire `classifyProject` function (lines 64-105) in `lib/ai.ts`:

```typescript
export async function classifyProject(
  content: string,
  type: string,
  existingProjects: { id: string; name: string; samples?: string[] }[]
): Promise<{ action: "none" } | { action: "new"; name: string } | { action: "existing"; project_id: string }> {
  const model = getGenAI().getGenerativeModel({ model: "gemini-2.0-flash" })

  let prompt: string
  if (existingProjects.length === 0) {
    prompt = `당신은 프로젝트 분류 전문가입니다. 콘텐츠를 보고 새 프로젝트를 만들지 판단하세요.
프로젝트는 관련 항목을 주제/테마별로 묶는 그룹입니다 (예: "웹 개발", "여행 계획", "업무").
콘텐츠 유형: ${type}

규칙:
- 명확한 주제가 있을 때만 새 프로젝트 생성
- 일상적이거나 짧은 메모는 "none" 반환
- 프로젝트 이름은 간결하게 (2~4단어)

JSON만 반환: {"action":"new","name":"프로젝트 이름"} 또는 {"action":"none"}

콘텐츠: ${content}`
  } else {
    const projectList = existingProjects
      .map((p) => {
        const sampleText = p.samples?.length
          ? `\n  최근 항목: ${p.samples.join(" | ")}`
          : ""
        return `- ${p.id}: ${p.name}${sampleText}`
      })
      .join("\n")

    const suppressNew = existingProjects.length >= 3
      ? "\n- 기존 프로젝트가 3개 이상이므로, 기존 프로젝트에 분류하는 것을 강하게 선호하세요. 정말 맞는 프로젝트가 없을 때만 새로 만드세요."
      : ""

    prompt = `당신은 프로젝트 분류 전문가입니다. 콘텐츠를 기존 프로젝트에 분류하거나 새 프로젝트를 제안하세요.

기존 프로젝트:
${projectList}

콘텐츠 유형: ${type}

규칙:
- 기존 프로젝트의 최근 항목을 참고하여 콘텐츠가 맞는 프로젝트에 분류
- 일상적이거나 짧은 메모는 "none" 반환${suppressNew}

JSON만 반환:
- {"action":"existing","project_id":"<id>"} 기존 프로젝트에 맞을 때
- {"action":"new","name":"프로젝트 이름"} 새 프로젝트가 필요할 때
- {"action":"none"} 어디에도 맞지 않을 때

콘텐츠: ${content}`
  }

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      try { return JSON.parse(match[0]) } catch { /* ignore */ }
    }
    return { action: "none" }
  }
}
```

**Step 2: Verify the full app builds**

Run: `npm run build`
Expected: PASS — all signatures match, no type errors.

**Step 3: Commit**

```bash
git add lib/ai.ts
git commit -m "feat: rewrite classifyProject with Korean prompt, samples context, and new-project suppression"
```

---

### Task 5: Manual integration test

Test the full flow by saving a new item from the MindFlow app and verifying improved AI behavior.

**Files:** None (manual test)

**Step 1: Test tag accuracy with Korean content**

1. Open MindFlow app in browser
2. Save a text item with Korean content: "팀 회의에서 Q3 마케팅 전략 논의했음. SNS 캠페인 예산 증가 필요"
3. Check the auto-assigned tags — should be specific (e.g., "회의", "마케팅"), not generic ("general", "note")
4. Save another item about a similar topic to verify tag reuse

**Step 2: Test project classification**

1. Save an item about a topic matching an existing project
2. Verify it gets classified into the correct existing project (not creating a new one)
3. If 3+ projects exist, verify the AI doesn't aggressively create new projects

**Step 3: Final commit with all changes**

If any adjustments were needed during testing:

```bash
git add -A
git commit -m "fix: adjust AI prompts after integration testing"
```

---

## Summary

| Task | File | Change |
|------|------|--------|
| 1 | `app/api/ai/tag/route.ts` | User-scoped tag frequency query |
| 2 | `lib/ai.ts` | Rewrite `generateTags` (Korean, frequency, few-shot) |
| 3 | `app/api/ai/tag/route.ts` | Project item context query |
| 4 | `lib/ai.ts` | Rewrite `classifyProject` (Korean, samples, suppression) |
| 5 | Manual | Integration test |

**Dependencies:** Task 1 → Task 2 (signature change). Task 3 → Task 4 (signature change). Task 5 depends on all.

**Already done:** Related items (Section 2 of design) — endpoint and UI already exist.

**Risk:** Prompt changes may need iteration based on real-world results. The tag frequency query adds 1 extra DB query per save. The project context query adds N queries (one per project) — acceptable for typical user with <10 projects.
