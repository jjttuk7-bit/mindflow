# MindFlow Mobile-First Redesign

**Date:** 2026-03-01
**Goal:** Transform MindFlow into a production-grade mobile-first personal knowledge manager
**Approach:** Mobile-First Redesign (Approach B)

## Context

- Target: Daily-use product
- Primary device: Mobile (desktop secondary)
- Scope: Quality-first - stabilize existing features, redesign for mobile UX
- Backend remains unchanged; frontend-focused overhaul

---

## Section 1: Mobile Navigation & Layout

### Current
- Hamburger menu + sidebar drawer (requires two taps for any navigation)
- Sidebar contains: projects, smart folders, tags, type filters, todos, insights, chat, archive, settings

### New
- **Bottom Tab Navigation** (mobile only, 5 tabs):
  1. Feed (home) - main content feed
  2. Projects - project list & items
  3. Todo - task management
  4. AI Chat - chat interface
  5. More - settings, archive, insights, export
- **Floating Action Button (FAB)**: bottom-right, opens full-screen composer
- **Simple Header**: app title + active filter indicator + search icon + profile avatar
- **Type Filter Chips**: horizontal scrollable chips at top of feed (All, Ideas, Links, Images, Voice)
- **Tag Filter**: accessible from feed header as dropdown/sheet
- **Desktop (md+)**: Keep existing sidebar layout unchanged

### Layout Structure (Mobile)
```
[Header: title + search + avatar]
[Filter chips: All | Ideas | Links | Images | Voice]
[Scrollable feed area]
[FAB button - bottom right]
[Bottom tabs: Feed | Projects | Todo | Chat | More]
```

---

## Section 2: Feed Cards & Interactions

### Swipe Actions
- Swipe left → Archive (red background with archive icon)
- Swipe right → Pin/Unpin (amber background with pin icon)
- Long press → Context menu (edit, move to project, delete, share)

### Pull-to-Refresh
- Pull down on feed to trigger data refresh
- Animated spinner indicator

### Card Improvements
- Minimum 44px touch targets
- Larger tag chips (easier to tap)
- Better image thumbnails (aspect-ratio preserved)
- Clearer type indicators

---

## Section 3: Full-Screen Composer (Mobile)

### Current
- Inline composer at top of feed (hard to reach with thumb)

### New
- FAB triggers bottom-sheet or full-screen modal
- Type selection tabs at top (Text, Link, Image, Voice)
- Full-screen input area for comfortable typing
- Header with close (X) and Save button
- Type-specific optimizations:
  - Image: gallery grid + camera button (only when camera available)
  - Voice: large record button + waveform visualization
  - Link: URL input + auto-preview
- Desktop: keep inline composer (current behavior)

---

## Section 4: Bug Fixes & Stability

### Storage Buckets (DONE)
- Created `items-images` and `items-audio` Supabase storage buckets
- Added RLS policies for authenticated upload + public read
- Improved upload error messages

### Camera Detection (DONE)
- Camera button only shows when device has camera

### Loading States
- Add skeleton UI for: feed cards, project list, todo list, insights
- Skeleton matches actual card layout for smooth transition

### Toast Notification System
- Success: item saved, archived, deleted
- Error: upload failed, network error, save failed
- Info: auto-tag applied, transcription complete
- Use lightweight toast component (sonner or custom)

### Empty States
- Custom illustrations + helpful messages for:
  - Empty feed: "Capture your first thought"
  - Empty project: "Add items to this project"
  - Empty todos: "All caught up!"
  - No search results: "Try different keywords"

### Error Recovery
- Network error → retry button
- Failed operations → rollback UI + error toast
- API errors → user-friendly messages (not raw error codes)

---

## Section 5: Performance

### Optimistic Updates
- Pin/unpin, archive, delete: update UI immediately
- Rollback on API failure with error toast
- Reduces perceived latency significantly

### Image Lazy Loading
- `loading="lazy"` on all feed images
- Intersection Observer for below-fold content
- Low-quality placeholder while loading

### Infinite Scroll
- Current: load 50 items at once
- New: load 20 items initially, load more on scroll
- Loading indicator at bottom of feed
- "No more items" indicator when all loaded

### Search Debounce
- 300ms debounce on search input
- Cancel previous request on new input

---

## Section 6: AI Enhancements

### Search Result Highlights
- Highlight matching keywords in search results
- Show relevance score or matched context snippet

### AI Chat UX (Mobile)
- Full-screen chat view (not side panel)
- Source items are tappable → navigate to item
- Typing indicator while AI responds
- Chat history accessible from chat tab

### Auto-Summary
- Generate one-line summary for text items > 200 characters
- Display summary on card, full content on detail view
- Non-blocking: generate in background after save

---

## Implementation Priority

1. **P0 - Navigation & Layout** (highest impact on mobile UX)
2. **P0 - Bug fixes & Stability** (required for daily use)
3. **P1 - Full-screen Composer**
4. **P1 - Feed Cards & Swipe Actions**
5. **P2 - Performance Optimizations**
6. **P2 - AI Enhancements**

## Tech Notes

- Swipe gestures: use CSS transforms + touch events (no heavy library)
- Bottom tabs: new `BottomNav` component, render only on mobile
- FAB: fixed positioned button with z-index above feed
- Toast: lightweight custom component or `sonner` package
- Skeleton: Shadcn skeleton component (already available)
- Infinite scroll: Intersection Observer API
- Optimistic updates: extend Zustand store actions
