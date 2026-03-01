# MindFlow AI Enhancement Design

**Date:** 2026-03-01
**Goal:** Improve AI tagging accuracy, add related item recommendations, and enhance project classification
**Approach:** Core-focused improvement (Approach A) - leverage existing infrastructure with better prompts and minimal new APIs

## Context

- Current AI: auto-tag, summary, embeddings, project classify, todo extract, image describe, voice transcribe, RAG chat
- Pain point: auto-tagging/classification inaccuracy
- Desired feature: related item recommendations
- All AI powered by Google Gemini (2.0-flash + embedding-001)
- Embeddings stored in pgvector, `match_items` RPC already exists

---

## Section 1: Tag Accuracy Improvement

### Current Problems
- `generateTags` prompt is English-only (users write Korean)
- Existing tags passed as flat list without frequency/context
- No user-scoped tag filtering (global tags table)
- No few-shot examples for quality guidance

### Solution
1. **Korean-optimized prompt**: Bilingual prompt that handles Korean content natively
2. **Tag frequency info**: Query tag usage counts per user, pass as `"web-dev (15), meeting (8)"` so AI prefers high-frequency tags
3. **User-scoped tags**: Filter tags by user_id via item_tags join
4. **Few-shot examples**: Include good/bad tag examples in prompt
5. **Strict constraints**: 1-3 tags max, ban generic tags ("general", "other", "misc")

### Files Changed
- `lib/ai.ts` - Rewrite `generateTags` prompt
- `app/api/ai/tag/route.ts` - Add tag frequency query with user scope

---

## Section 2: Related Item Recommendations

### Approach
Use existing embedding infrastructure. After generating embedding for new item, query `match_items` RPC to find similar existing items.

### Data Flow
1. Item saved → `/api/ai/tag` called (existing)
2. After embedding generated, call `match_items` RPC for top 3-5 similar items (new)
3. Return `related_items: [{ id, content, similarity }]` in response
4. Frontend shows related items in feed card

### Constraints
- Exclude self from results
- Minimum similarity threshold: 0.5
- Max 5 related items
- Only items from same user

### UI
- Feed card footer: collapsible "Related items (N)" section
- Tap to expand and see related item titles
- Each related item is tappable (scroll to or highlight)

### Files Changed
- `app/api/ai/tag/route.ts` - Add related items query after embedding
- `components/feed-card.tsx` - Add related items UI section

---

## Section 3: Project Classification Improvement

### Current Problems
- `classifyProject` receives only project `name` (no context)
- AI doesn't know what items exist in each project
- Creates new projects too aggressively

### Solution
1. **Project context**: Include 3 most recent item summaries per project in prompt
2. **New project suppression**: When 3+ projects exist, bias toward existing projects
3. **Korean prompt**: Rewrite classification prompt in Korean

### Files Changed
- `lib/ai.ts` - Rewrite `classifyProject` with richer context
- `app/api/ai/tag/route.ts` - Query recent items per project for context

---

## Architecture Summary

| File | Changes |
|------|---------|
| `lib/ai.ts` | Rewrite generateTags, classifyProject prompts |
| `app/api/ai/tag/route.ts` | Tag frequency query, related items query, project context query |
| `components/feed-card.tsx` | Related items collapsible UI |

**Cost impact:** No additional Gemini API calls. 2-3 extra DB queries per item save (tag frequency, related items, project items).

**Risk:** Prompt changes may need iteration. Related items similarity threshold (0.5) may need tuning.

## Implementation Priority

1. P0: Tag accuracy (generateTags prompt rewrite + frequency)
2. P0: Related items API + UI
3. P1: Project classification improvement
