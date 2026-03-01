# MindFlow API Reference

All endpoints require authentication via Supabase session cookie unless noted otherwise.

## Items

### `GET /api/items`
Fetch user's items with optional filters.

| Param | Type | Description |
|-------|------|-------------|
| `project_id` | query, uuid | Filter by project |
| `tag` | query, string | Filter by tag name |
| `type` | query, string | Filter by type: text, link, image, voice |
| `is_pinned` | query, boolean | Filter pinned items |
| `is_archived` | query, boolean | Filter archived items |
| `cursor` | query, string | Pagination cursor (ISO date) |
| `limit` | query, number | Items per page (default: 20) |

### `POST /api/items`
Create a new item.

```json
{
  "type": "text | link | image | voice",
  "content": "string (1-50000 chars)",
  "metadata": {}
}
```

### `PATCH /api/items/:id`
Update an item.

```json
{
  "content": "string",
  "summary": "string (max 500)",
  "is_pinned": true,
  "is_archived": false,
  "project_id": "uuid | null",
  "metadata": {}
}
```

### `DELETE /api/items/:id`
Delete an item.

### `GET /api/items/:id/related`
Get related items by embedding similarity.

---

## AI

### `POST /api/ai/tag`
Auto-tag, summarize, and classify an item. Rate limited: 20/min.

```json
{
  "item_id": "uuid",
  "content": "string (1-50000 chars)",
  "type": "text | link | image | voice"
}
```

### `GET /api/ai/briefing`
Generate daily briefing with greeting and suggestions.

### `POST /api/ai/describe-image`
Generate a concise caption for an image. Rate limited: 10/min.

Body: `FormData` with `image` field.

### `POST /api/ai/transcribe`
Transcribe audio to text. Rate limited: 10/min.

Body: `FormData` with `audio` field.

### `GET /api/ai/resurface`
Get AI-suggested items to revisit.

---

## Chat

### `POST /api/chat`
Send a message to AI chat (RAG-powered). Rate limited: 10/min.

```json
{
  "message": "string (1-10000 chars)",
  "session_id": "uuid (optional)"
}
```

Response:
```json
{
  "session_id": "uuid",
  "message": "AI response",
  "sources": [{ "id": "...", "content": "..." }]
}
```

### `GET /api/chat/sessions`
List all chat sessions.

### `GET /api/chat/sessions/:id`
Get messages for a chat session.

---

## Search

### `POST /api/search`
Semantic search using vector embeddings. Rate limited: 20/min.

```json
{
  "query": "string (1-500 chars)",
  "limit": 10
}
```

---

## Projects

### `GET /api/projects`
List all user projects.

### `POST /api/projects`
Create a new project.

```json
{
  "name": "string (1-100 chars)",
  "color": "#hex6 (optional, default #8B7355)",
  "description": "string (max 500, optional)"
}
```

### `PATCH /api/projects/:id`
Update a project.

### `DELETE /api/projects/:id`
Delete a project (unlinks items first).

---

## Todos

### `GET /api/todos`
List all todos. Supports `?project_id=` filter.

### `POST /api/todos`
Create a new todo.

```json
{
  "content": "string (1-2000 chars)",
  "project_id": "uuid | null",
  "item_id": "uuid | null",
  "due_date": "ISO datetime | null"
}
```

### `PATCH /api/todos/:id`
Update a todo.

### `DELETE /api/todos/:id`
Delete a todo.

---

## Tags

### `GET /api/tags`
List all tags.

### `PATCH /api/tags/:id`
Rename a tag.

```json
{ "name": "string (1-100 chars)" }
```

### `DELETE /api/tags/:id`
Delete a tag and its associations.

---

## Settings

### `GET /api/settings`
Get user settings (auto-creates if not exists).

### `PATCH /api/settings`
Update user settings.

```json
{
  "preferences": {},
  "telegram_chat_id": "string | null",
  "telegram_linked_at": "ISO datetime | null"
}
```

---

## Share

### `POST /api/share`
Create a share link for an item.

```json
{ "itemId": "uuid" }
```

### `GET /api/share/:token` (Public)
Get a shared item by token. No auth required.

---

## Export

### `POST /api/export/summary`
Generate AI-organized summary of items. Rate limited: 5/min.

```json
{
  "item_ids": ["uuid"],
  "project_id": "uuid",
  "tag": "string",
  "depth": "brief | detailed"
}
```

---

## Insights

### `GET /api/insights`
List monthly insight reports.

### `GET /api/insights/:id`
Get a specific insight report.

---

## Other

### `GET /api/profile`
Get user profile info.

### `GET /api/knowledge-map`
Get tag-item relationship data for visualization.

### `POST /api/upload`
Upload image or audio file. Body: `FormData`.

### `POST /api/stripe/checkout`
Create Stripe checkout session for Pro upgrade.

### `POST /api/stripe/portal`
Create Stripe customer portal session.

### `POST /api/stripe/webhook`
Stripe webhook handler (no auth, verified by signature).

### `POST /api/telegram/link`
Generate Telegram bot linking code.

### `POST /api/telegram/webhook`
Telegram bot webhook handler.

### `POST /api/cron/monthly-insight`
Generate monthly insight report (cron job, requires CRON_SECRET).

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message",
  "details": "field: validation message"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request / validation error |
| 401 | Unauthorized |
| 403 | Forbidden (plan limit reached) |
| 404 | Not found |
| 429 | Rate limit exceeded |
| 500 | Server error |
