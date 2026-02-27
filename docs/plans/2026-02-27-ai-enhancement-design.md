# AI Enhancement Design

## Scope
1. **Auto-summary** — generate one-line summary on save (content > 100 chars)
2. **Semantic search** — pgvector embeddings + cosine similarity via Ctrl+K
3. **Related items** — show 3 similar items at card bottom

## Auto-summary
- Trigger: on save, alongside tagging
- Model: gpt-4o-mini, "summarize in one sentence"
- Store: `items.summary` text column
- Display: show summary in card, expand to full content

## Semantic Search
- Embeddings: text-embedding-3-small (1536 dims)
- Store: `items.embedding` vector(1536) with ivfflat index
- API: `POST /api/search` — embed query, cosine similarity top N
- UI: Ctrl+K dialog upgraded to semantic search

## Related Items
- Method: cosine distance on embeddings, top 3
- API: `GET /api/items/:id/related`
- Display: chips at card bottom

## DB Changes
```sql
create extension if not exists vector;
alter table items add column summary text;
alter table items add column embedding vector(1536);
create index on items using ivfflat (embedding vector_cosine_ops) with (lists = 100);
```
