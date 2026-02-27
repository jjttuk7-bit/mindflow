# Mindflow - AI Personal Knowledge Manager

## Overview

Mindflow is a personal "Second Brain" web app for quickly capturing thoughts, ideas, links, images, and voice memos. An AI agent automatically classifies and tags all saved content, making it easy to organize and retrieve knowledge.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Target User | Individual knowledge worker | Personal use, not team collaboration |
| AI Role | Auto classification & tagging | Organize content without manual effort |
| Design Style | Minimal & Clean (Notion/Linear) | Wide whitespace, clean typography, borderless |
| Layout | Stream Feed with sidebar | Quick capture + chronological browsing |
| Input Priority | Text > Link > Image > Voice | Text is primary input method |
| Platform | Desktop web first | Mobile responsive later |

## Layout & Core UI

### 2-Column Layout

- **Left Sidebar (240px fixed)**
  - Logo / App name
  - AI-generated tag list with counts
  - Type filter (All / Ideas / Links / Images / Voice)
  - Search (Cmd+K shortcut)

- **Right Main Area (flex)**
  - Top: Composer (always pinned)
  - Bottom: Chronological feed (infinite scroll)

### Composer (Input Area)

- Large, wide text input: "What's on your mind?"
- Bottom row: type toggle buttons (Text / Link / Image Upload / Voice Record)
- Enter to save, Shift+Enter for newline
- On save, AI analyzes and tags in background

### Feed Cards

- Content type icon + body preview
- AI-assigned tags (chip style)
- Relative timestamp ("2 min ago")
- Edit/delete actions on hover

```
┌──────────┬──────────────────────────┐
│ Mindflow │                          │
│          │  ┌────────────────────┐  │
│ Tags     │  │ What's on your mind? │  │
│ ──────   │  │ [📝][🔗][📷][🎤]    │  │
│ #dev (5) │  └────────────────────┘  │
│ #design  │                          │
│ #link    │  ┌────────────────────┐  │
│ #meeting │  │ 💡 API design idea   │  │
│          │  │ #dev #architecture  │  │
│ Filter   │  │ 2min ago            │  │
│ ──────   │  └────────────────────┘  │
│ All      │  ┌────────────────────┐  │
│ Ideas    │  │ 🔗 React patterns    │  │
│ Links    │  │ #dev #frontend     │  │
│ Images   │  │ 5min ago            │  │
│ Voice    │  └────────────────────┘  │
└──────────┴──────────────────────────┘
```

## Content Types & AI Tagging

### 4 Content Types

| Type | Input Method | AI Processing |
|------|-------------|---------------|
| Text | Direct typing | Analyze content, assign topic tags |
| Link | Paste URL | Extract OG meta (title/desc/thumbnail) + topic tags |
| Image | Drag & drop / file picker | Store image + optional memo + tags |
| Voice | Record button | Store audio + STT transcription + tags |

### AI Auto-Tagging Flow

1. User saves content
2. Immediately appears in feed (tags show "Analyzing...")
3. AI analyzes content in background
4. Assigns 1-3 tags (reuses existing tags first)
5. User can edit/add/remove tags manually

### Tag Rules

- AI reuses existing tags first (prevents tag explosion)
- Creates new tags only when necessary
- Users can manually create tags
- Sidebar shows per-tag content count

## Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Framework | Next.js 15 (App Router) | SSR + API Routes integrated |
| Styling | Tailwind CSS + shadcn/ui | Fits minimal design, already set up |
| State | Zustand | Lightweight and simple |
| Database | Supabase (PostgreSQL) | Auth + DB + Storage all-in-one |
| AI | OpenAI API | Text analysis and tag generation |
| File Storage | Supabase Storage | Image/voice file storage |
| Deployment | Vercel | Optimized for Next.js |

## Data Model

```sql
-- Content items
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('text', 'link', 'image', 'voice')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Many-to-many relationship
CREATE TABLE item_tags (
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);
```

### Metadata JSON Structure

- **Link**: `{ og_title, og_description, og_image }`
- **Image**: `{ file_url, file_size, mime_type }`
- **Voice**: `{ file_url, duration, transcript }`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/items | Save content (triggers async AI tagging) |
| GET | /api/items | Fetch feed (filter/tag/pagination) |
| PATCH | /api/items/:id | Update content or tags |
| DELETE | /api/items/:id | Delete item |
| POST | /api/ai/tag | AI tag analysis (internal) |

## Pages

| Route | Description |
|-------|-------------|
| `/` | Main feed with composer and sidebar |
| `/search` | Full-text search results |
| `/tag/:name` | Filtered view by tag |
