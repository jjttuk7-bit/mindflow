# Input Expansion Phase 1 — Design

## Scope
1. **Link OG Preview** — Rich card with title, description, thumbnail
2. **Image Upload** — Supabase Storage direct upload with lightbox

Voice is deferred to a later phase.

## Link OG Preview
- Composer shows URL input when type=link
- Server-side OG scraping with `open-graph-scraper`
- `meta` jsonb stores `{ og_title, og_description, og_image, og_url, og_domain }`
- Horizontal card layout: thumbnail (left) + title/desc/domain (right)
- Click opens original URL in new tab

## Image Upload
- Composer shows drag-and-drop zone + file picker when type=image
- Client uploads directly to Supabase Storage `items-images` bucket
- `meta` jsonb stores `{ image_url }`, `content` = caption text
- Card shows image (max-h-64, rounded, object-cover) + caption
- Click opens Lightbox modal with full-size image

## Technical Changes
- New package: `open-graph-scraper`
- New Supabase bucket: `items-images` (public)
- New components: `LinkCard`, `ImageCard`, `ImageLightbox`
- Modified: `composer.tsx`, `feed-card.tsx`, `POST /api/items`
