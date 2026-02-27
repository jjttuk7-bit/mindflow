# Content Management Design

**Goal:** Add pin, archive, inline edit, sorting, and tag management to Mindflow

## Features

### 1. Pin/Favorite
- `is_pinned` boolean column on items table
- Pin button on card hover (next to delete)
- Pinned items shown in separate "Pinned" section at feed top

### 2. Archive
- `is_archived` boolean column on items table
- Archive button on card hover
- Sidebar toggle to view archived items
- Restore button in archive view

### 3. Inline Edit
- Edit button on card hover
- Content becomes textarea with save/cancel
- PATCH API updates content and re-triggers AI tagging

### 4. Sort
- Dropdown at feed top: Newest (default), Oldest, By type
- Client-side sorting via Zustand store

### 5. Tag Management
- Hover menu on sidebar tags (rename, delete)
- Inline rename input
- Delete with confirmation, unlinks from items

## DB Changes
```sql
ALTER TABLE items ADD COLUMN is_pinned boolean DEFAULT false;
ALTER TABLE items ADD COLUMN is_archived boolean DEFAULT false;
```

## API Endpoints
- PATCH /api/items/:id — update content, is_pinned, is_archived
- PATCH /api/tags/:id — rename tag
- DELETE /api/tags/:id — delete tag + unlink
