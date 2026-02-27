# Collaboration & Sharing Design

**Goal:** Add share links, export (Markdown/JSON), and public profile to Mindflow

## Features

### 1. Share Links
- `shared_items` table with UUID tokens
- Share button on card hover → generates token → copies URL
- `/share/:token` read-only page (no auth required)

### 2. Export
- Export button in sidebar footer
- Dropdown: Markdown / JSON
- Client-side file download via Blob URL

### 3. Public Profile
- `/profile` page showing shared items in grid layout
- Tag filtering, responsive 1-3 column grid
- Mindflow branding header

## DB Changes
```sql
CREATE TABLE shared_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id uuid REFERENCES items(id) ON DELETE CASCADE,
  token uuid DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

## New Files
- app/share/[token]/page.tsx
- app/profile/page.tsx
- app/api/share/route.ts
- app/api/share/[token]/route.ts
- components/export-menu.tsx
- components/share-button.tsx
