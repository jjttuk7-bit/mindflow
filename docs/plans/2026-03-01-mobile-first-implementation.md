# MindFlow Mobile-First Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform MindFlow into a production-grade mobile-first app with bottom tab navigation, FAB composer, swipe actions, toast notifications, skeleton loading, and performance optimizations.

**Architecture:** Keep existing backend/API unchanged. Rebuild mobile frontend with bottom tab nav (new `BottomNav` component), full-screen composer modal, swipeable feed cards, and toast system. Desktop (md+) retains sidebar layout. Zustand store extended with optimistic updates and new UI state.

**Tech Stack:** Next.js 16, React 19, TailwindCSS 4, Zustand, Shadcn/UI, sonner (toasts)

---

## Phase 1: Foundation & Dependencies

### Task 1: Install sonner toast library

**Files:**
- Modify: `package.json`
- Modify: `app/layout.tsx`

**Step 1: Install sonner**

Run: `npm install sonner`

**Step 2: Add Toaster to root layout**

In `app/layout.tsx`, import and add `<Toaster />` from sonner inside the body, after `{children}`:

```tsx
import { Toaster } from "sonner"

// Inside body, after {children}:
<Toaster position="top-center" richColors closeButton />
```

**Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add package.json package-lock.json app/layout.tsx
git commit -m "feat: add sonner toast library"
```

---

### Task 2: Extend Zustand store with new mobile UI state

**Files:**
- Modify: `lib/store.ts`

**Step 1: Add new state fields to store**

Add to `MindflowStore` interface:

```ts
composerOpen: boolean
setComposerOpen: (open: boolean) => void
activeTab: "feed" | "projects" | "todos" | "chat" | "more"
setActiveTab: (tab: "feed" | "projects" | "todos" | "chat" | "more") => void
```

Add to `create<MindflowStore>`:

```ts
composerOpen: false,
setComposerOpen: (composerOpen) => set({ composerOpen }),
activeTab: "feed",
setActiveTab: (activeTab) => set({ activeTab }),
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add lib/store.ts
git commit -m "feat: extend store with composerOpen and activeTab state"
```

---

## Phase 2: Mobile Navigation & Layout

### Task 3: Create BottomNav component

**Files:**
- Create: `components/bottom-nav.tsx`

**Step 1: Create the bottom navigation component**

```tsx
"use client"

import { useStore } from "@/lib/store"
import { Home, FolderOpen, ListTodo, MessageSquare, MoreHorizontal } from "lucide-react"

const tabs = [
  { id: "feed" as const, icon: Home, label: "Feed" },
  { id: "projects" as const, icon: FolderOpen, label: "Projects" },
  { id: "todos" as const, icon: ListTodo, label: "Todo" },
  { id: "chat" as const, icon: MessageSquare, label: "Chat" },
  { id: "more" as const, icon: MoreHorizontal, label: "More" },
]

export function BottomNav() {
  const { activeTab, setActiveTab } = useStore()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-lg md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                active ? "text-primary" : "text-muted-foreground/60"
              }`}
            >
              <tab.icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
```

**Step 2: Add safe-area CSS**

In `app/globals.css` or tailwind config, ensure `.safe-area-bottom` uses `padding-bottom: env(safe-area-inset-bottom)`.

**Step 3: Commit**

```bash
git add components/bottom-nav.tsx
git commit -m "feat: create BottomNav component for mobile"
```

---

### Task 4: Create FAB (Floating Action Button) component

**Files:**
- Create: `components/fab.tsx`

**Step 1: Create the FAB component**

```tsx
"use client"

import { useStore } from "@/lib/store"
import { Plus } from "lucide-react"

export function FAB() {
  const { setComposerOpen } = useStore()

  return (
    <button
      onClick={() => setComposerOpen(true)}
      className="fixed right-4 bottom-20 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 flex items-center justify-center active:scale-95 transition-transform md:hidden"
      aria-label="New capture"
    >
      <Plus className="h-6 w-6" />
    </button>
  )
}
```

**Step 2: Commit**

```bash
git add components/fab.tsx
git commit -m "feat: create FAB component for mobile composer"
```

---

### Task 5: Create FilterChips component for mobile feed header

**Files:**
- Create: `components/filter-chips.tsx`

**Step 1: Create horizontal scrollable filter chips**

```tsx
"use client"

import { useStore } from "@/lib/store"
import { ContentType } from "@/lib/supabase/types"
import { Layers, FileText, Link, Image, Mic } from "lucide-react"

const filters: { value: ContentType | "all"; icon: React.ReactNode; label: string }[] = [
  { value: "all", icon: <Layers className="h-3.5 w-3.5" />, label: "All" },
  { value: "text", icon: <FileText className="h-3.5 w-3.5" />, label: "Ideas" },
  { value: "link", icon: <Link className="h-3.5 w-3.5" />, label: "Links" },
  { value: "image", icon: <Image className="h-3.5 w-3.5" />, label: "Images" },
  { value: "voice", icon: <Mic className="h-3.5 w-3.5" />, label: "Voice" },
]

export function FilterChips() {
  const { activeFilter, setActiveFilter, setSmartFolder } = useStore()

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-2">
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => { setActiveFilter(f.value); setSmartFolder(null) }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
            activeFilter === f.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted/60 text-muted-foreground hover:bg-muted"
          }`}
        >
          {f.icon}
          {f.label}
        </button>
      ))}
    </div>
  )
}
```

**Step 2: Add no-scrollbar utility to CSS**

```css
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
```

**Step 3: Commit**

```bash
git add components/filter-chips.tsx
git commit -m "feat: create FilterChips horizontal scrollable component"
```

---

### Task 6: Create MobileHeader component

**Files:**
- Create: `components/mobile-header.tsx`

**Step 1: Create the mobile header**

```tsx
"use client"

import { useStore } from "@/lib/store"
import { Search } from "lucide-react"
import { UserMenu } from "@/components/user-menu"

export function MobileHeader() {
  return (
    <div className="flex items-center justify-between px-4 pt-3 pb-1 md:hidden">
      <h1 className="font-display text-xl tracking-tight text-foreground">Mindflow</h1>
      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            // Trigger Ctrl+K search dialog
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))
          }}
          className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>
        <UserMenu />
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/mobile-header.tsx
git commit -m "feat: create MobileHeader component"
```

---

### Task 7: Create MoreMenu panel for the "More" tab

**Files:**
- Create: `components/more-menu.tsx`

**Step 1: Create the More tab content**

This replaces what was previously scattered in the sidebar. Shows: Smart Folders (This Week, Pinned), Archive, Insights link, Settings link, Theme toggle, Export.

```tsx
"use client"

import { useStore } from "@/lib/store"
import { useTheme } from "@/hooks/use-theme"
import { ExportMenu } from "@/components/export-menu"
import {
  CalendarDays, Pin, Archive, BarChart3, Settings, Sun, Moon,
} from "lucide-react"

export function MoreMenu() {
  const {
    showArchived, setShowArchived, smartFolder, setSmartFolder,
    setActiveFilter, setActiveTag, setActiveProject, setActiveTab,
    items,
  } = useStore()
  const { dark, toggle } = useTheme()

  const archivedCount = items.filter((i) => i.is_archived).length
  const pinnedCount = items.filter((i) => i.is_pinned && !i.is_archived).length
  const thisWeekCount = (() => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return items.filter((i) => !i.is_archived && new Date(i.created_at) >= weekAgo).length
  })()

  function goToSmartFolder(folder: string) {
    setSmartFolder(folder)
    setActiveFilter("all")
    setActiveTag(null)
    setActiveProject(null)
    if (showArchived) setShowArchived(false)
    setActiveTab("feed")
  }

  return (
    <main className="flex-1 flex flex-col h-screen overflow-hidden bg-background pb-16">
      <div className="px-4 pt-6 pb-4">
        <h2 className="font-display text-xl tracking-tight text-foreground">More</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 space-y-1">
        {/* Smart Folders */}
        <p className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground/70 px-3 pt-4 pb-2">
          Smart Folders
        </p>
        <button
          onClick={() => goToSmartFolder("this-week")}
          className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm hover:bg-accent transition-colors"
        >
          <span className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-muted-foreground/60" />
            This Week
          </span>
          <span className="text-xs text-muted-foreground/50 tabular-nums">{thisWeekCount}</span>
        </button>
        <button
          onClick={() => goToSmartFolder("pinned")}
          className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm hover:bg-accent transition-colors"
        >
          <span className="flex items-center gap-3">
            <Pin className="h-5 w-5 text-muted-foreground/60" />
            Pinned
          </span>
          <span className="text-xs text-muted-foreground/50 tabular-nums">{pinnedCount}</span>
        </button>
        <button
          onClick={() => { setShowArchived(!showArchived); setSmartFolder(null); setActiveTab("feed") }}
          className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm hover:bg-accent transition-colors"
        >
          <span className="flex items-center gap-3">
            <Archive className="h-5 w-5 text-muted-foreground/60" />
            Archive
          </span>
          <span className="text-xs text-muted-foreground/50 tabular-nums">{archivedCount}</span>
        </button>

        {/* Links */}
        <p className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground/70 px-3 pt-6 pb-2">
          Settings
        </p>
        <a href="/insights" className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm hover:bg-accent transition-colors">
          <BarChart3 className="h-5 w-5 text-muted-foreground/60" />
          Insights
        </a>
        <a href="/settings" className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm hover:bg-accent transition-colors">
          <Settings className="h-5 w-5 text-muted-foreground/60" />
          Settings
        </a>
        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm hover:bg-accent transition-colors"
        >
          {dark ? <Sun className="h-5 w-5 text-muted-foreground/60" /> : <Moon className="h-5 w-5 text-muted-foreground/60" />}
          {dark ? "Light Mode" : "Dark Mode"}
        </button>
        <div className="px-1">
          <ExportMenu />
        </div>
      </div>
    </main>
  )
}
```

**Step 2: Commit**

```bash
git add components/more-menu.tsx
git commit -m "feat: create MoreMenu panel for mobile More tab"
```

---

### Task 8: Create MobileProjectList component

**Files:**
- Create: `components/mobile-project-list.tsx`

**Step 1: Create a mobile-optimized project list view**

Similar to the sidebar project section but full-screen. Shows project list with item counts. Tapping a project sets `activeProject` and switches to feed tab to show filtered items. Include "New Project" button at top.

Key behaviors:
- List all projects with color indicator and item count
- Tap project → `setActiveProject(id)` + `setActiveTab("feed")`
- "+" button to create new project (inline input)
- Swipe left to delete (reuse swipe pattern from Task 12)

**Step 2: Commit**

```bash
git add components/mobile-project-list.tsx
git commit -m "feat: create MobileProjectList for Projects tab"
```

---

### Task 9: Restructure app/page.tsx for mobile tabs

**Files:**
- Modify: `app/page.tsx`

**Step 1: Integrate mobile components into main page**

Replace current layout with tab-aware rendering:

```tsx
"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { MainFeed } from "@/components/main-feed"
import { SearchDialog } from "@/components/search-dialog"
import { ChatPanel } from "@/components/chat-panel"
import { TodoList } from "@/components/todo-list"
import { BottomNav } from "@/components/bottom-nav"
import { FAB } from "@/components/fab"
import { MobileHeader } from "@/components/mobile-header"
import { FilterChips } from "@/components/filter-chips"
import { MoreMenu } from "@/components/more-menu"
import { MobileProjectList } from "@/components/mobile-project-list"
import { MobileComposer } from "@/components/mobile-composer"
import { useItems } from "@/hooks/use-items"
import { useProjects } from "@/hooks/use-projects"
import { useTodos } from "@/hooks/use-todos"
import { useStore } from "@/lib/store"

export default function Home() {
  const { refetch } = useItems()
  useProjects()
  useTodos()

  const { sidebarView, activeTab, composerOpen } = useStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Mobile: render based on activeTab
  const renderMobileContent = () => {
    switch (activeTab) {
      case "feed":
        return <MainFeed onRefetch={refetch} onMenuClick={() => setSidebarOpen(true)} />
      case "projects":
        return <MobileProjectList />
      case "todos":
        return <TodoList onMenuClick={() => setSidebarOpen(true)} />
      case "chat":
        return <ChatPanel fullScreen />
      case "more":
        return <MoreMenu />
      default:
        return <MainFeed onRefetch={refetch} onMenuClick={() => setSidebarOpen(true)} />
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop layout (unchanged) */}
      <div className="hidden md:contents">
        <Sidebar open={true} onClose={() => {}} />
        {sidebarView === "todos" ? (
          <TodoList onMenuClick={() => {}} />
        ) : (
          <MainFeed onRefetch={refetch} onMenuClick={() => {}} />
        )}
        <ChatPanel />
      </div>

      {/* Mobile layout */}
      <div className="md:hidden flex flex-col w-full h-screen">
        <MobileHeader />
        {activeTab === "feed" && <FilterChips />}
        <div className="flex-1 overflow-hidden">
          {renderMobileContent()}
        </div>
        {activeTab === "feed" && <FAB />}
        <BottomNav />
      </div>

      {/* Shared */}
      <SearchDialog />
      {composerOpen && <MobileComposer onSaved={refetch} />}
    </div>
  )
}
```

**Step 2: Update MainFeed to hide mobile header (now in MobileHeader)**

In `components/main-feed.tsx`, wrap the existing mobile header `<div className="... md:hidden">` in a condition or remove it, since `MobileHeader` handles this now.

**Step 3: Update ChatPanel to accept fullScreen prop**

Add `fullScreen?: boolean` prop to ChatPanel. When true, render as full-screen div instead of side panel. When false (desktop), keep current behavior.

**Step 4: Add `pb-16` to mobile scrollable areas**

All mobile tab content must have `pb-16` (or `pb-20` if FAB is present) to avoid content being hidden behind the bottom nav.

**Step 5: Verify on mobile viewport**

Run dev server: `npm run dev`
Test on mobile viewport (375px): verify bottom tabs show, FAB shows on feed tab, tabs switch correctly.

**Step 6: Commit**

```bash
git add app/page.tsx components/main-feed.tsx components/chat-panel.tsx
git commit -m "feat: restructure main page for mobile tab navigation"
```

---

## Phase 3: Full-Screen Mobile Composer

### Task 10: Create MobileComposer component

**Files:**
- Create: `components/mobile-composer.tsx`

**Step 1: Create the full-screen composer modal**

A full-screen overlay that opens when FAB is pressed. Reuses logic from existing `Composer` component but in a modal layout.

Key structure:
```
[X close]  New Capture  [Save button]
[Type tabs: Text | Link | Image | Voice]
[Full-screen input area]
```

- Close button dismisses modal via `setComposerOpen(false)`
- On successful save, show toast, close modal, trigger `onSaved`
- Type-specific input areas identical to current Composer
- Image upload with camera detection (already fixed)
- Voice recording full-width

**Step 2: Import toast from sonner for save feedback**

```tsx
import { toast } from "sonner"

// After successful save:
toast.success("Captured!")
```

**Step 3: Commit**

```bash
git add components/mobile-composer.tsx
git commit -m "feat: create full-screen MobileComposer for mobile"
```

---

## Phase 4: Feed Cards & Interactions

### Task 11: Create SwipeableCard wrapper component

**Files:**
- Create: `components/swipeable-card.tsx`

**Step 1: Create touch-based swipe wrapper**

Uses touch events (touchstart, touchmove, touchend) and CSS transforms. No external library.

Key behavior:
- Track touch deltaX
- If deltaX < -80px on release → trigger onSwipeLeft (archive)
- If deltaX > 80px on release → trigger onSwipeRight (pin)
- Colored background revealed behind card during swipe
- Spring back animation if threshold not met

```tsx
"use client"

import { useRef, useState } from "react"
import { Archive, Pin } from "lucide-react"

interface SwipeableCardProps {
  children: React.ReactNode
  onSwipeLeft: () => void   // archive
  onSwipeRight: () => void  // pin
}

export function SwipeableCard({ children, onSwipeLeft, onSwipeRight }: SwipeableCardProps) {
  const [deltaX, setDeltaX] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const isHorizontal = useRef<boolean | null>(null)

  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    isHorizontal.current = null
    setSwiping(true)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!swiping) return
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current

    // Determine direction on first significant move
    if (isHorizontal.current === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        isHorizontal.current = Math.abs(dx) > Math.abs(dy)
      }
      return
    }

    if (!isHorizontal.current) return
    e.preventDefault()
    setDeltaX(dx)
  }

  function handleTouchEnd() {
    if (deltaX < -80) onSwipeLeft()
    else if (deltaX > 80) onSwipeRight()
    setDeltaX(0)
    setSwiping(false)
    isHorizontal.current = null
  }

  const absX = Math.abs(deltaX)
  const progress = Math.min(absX / 80, 1)

  return (
    <div className="relative overflow-hidden rounded-xl md:overflow-visible">
      {/* Background indicators */}
      {deltaX < 0 && (
        <div className="absolute inset-0 flex items-center justify-end px-6 bg-destructive/15 rounded-xl">
          <Archive className={`h-5 w-5 text-destructive transition-opacity ${progress >= 1 ? "opacity-100" : "opacity-40"}`} />
        </div>
      )}
      {deltaX > 0 && (
        <div className="absolute inset-0 flex items-center justify-start px-6 bg-amber-500/15 rounded-xl">
          <Pin className={`h-5 w-5 text-amber-600 transition-opacity ${progress >= 1 ? "opacity-100" : "opacity-40"}`} />
        </div>
      )}

      {/* Card content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${deltaX}px)`,
          transition: swiping ? "none" : "transform 0.3s ease-out",
        }}
        className="relative bg-card"
      >
        {children}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/swipeable-card.tsx
git commit -m "feat: create SwipeableCard with touch swipe gestures"
```

---

### Task 12: Integrate SwipeableCard into FeedList

**Files:**
- Modify: `components/feed-list.tsx`
- Modify: `components/feed-card.tsx`

**Step 1: Wrap FeedCard with SwipeableCard on mobile**

In `feed-list.tsx`, wrap each `<FeedCard>` with `<SwipeableCard>` for mobile. Use `onSwipeLeft` for archive and `onSwipeRight` for pin toggle.

**Step 2: Add toast feedback**

```tsx
import { toast } from "sonner"

// onSwipeLeft:
toast("Archived", { icon: "📦" })

// onSwipeRight:
toast(item.is_pinned ? "Unpinned" : "Pinned", { icon: "📌" })
```

**Step 3: Commit**

```bash
git add components/feed-list.tsx
git commit -m "feat: integrate swipe actions into feed cards"
```

---

### Task 13: Add pull-to-refresh to mobile feed

**Files:**
- Modify: `components/main-feed.tsx`

**Step 1: Add pull-to-refresh mechanism**

Track touch events on the feed scroll container. When user pulls down past threshold (60px) at scroll position 0, trigger refetch.

Show a spinner at top during refresh. Use `onRefetch` prop that already exists.

**Step 2: Commit**

```bash
git add components/main-feed.tsx
git commit -m "feat: add pull-to-refresh to mobile feed"
```

---

### Task 14: Add long-press context menu for feed cards

**Files:**
- Create: `components/card-context-menu.tsx`
- Modify: `components/feed-card.tsx`

**Step 1: Create context menu component**

A bottom-sheet style menu that appears on long press (500ms). Options:
- Edit (text items only)
- Pin / Unpin
- Move to Project (with project list)
- Archive
- Share
- Delete (red, with confirmation)

**Step 2: Add long-press detection to FeedCard**

Use `onTouchStart` + setTimeout(500ms) pattern. Cancel on touchmove or touchend before timeout.

**Step 3: Commit**

```bash
git add components/card-context-menu.tsx components/feed-card.tsx
git commit -m "feat: add long-press context menu for mobile cards"
```

---

## Phase 5: Stability & Polish

### Task 15: Add toast notifications throughout the app

**Files:**
- Modify: `components/composer.tsx` (existing inline composer)
- Modify: `components/feed-card.tsx`
- Modify: `components/todo-list.tsx`

**Step 1: Replace alert/silent errors with toast calls**

In `composer.tsx`:
```tsx
import { toast } from "sonner"

// On success: toast.success("Saved!")
// On error: toast.error("Failed to save. Please try again.")
// On upload error: toast.error("Image upload failed")
```

In `feed-card.tsx`:
```tsx
// On delete: toast.success("Deleted")
// On pin: toast.success("Pinned") / toast.success("Unpinned")
// On archive: toast.success("Archived") / toast.success("Restored")
// On API error: toast.error("Something went wrong")
```

In `todo-list.tsx`:
```tsx
// On complete: toast.success("Done!")
// On delete: toast.success("Todo deleted")
```

**Step 2: Commit**

```bash
git add components/composer.tsx components/feed-card.tsx components/todo-list.tsx
git commit -m "feat: add toast notifications for all user actions"
```

---

### Task 16: Add skeleton loading states

**Files:**
- Create: `components/feed-skeleton.tsx`

**Step 1: Create skeleton component matching feed card layout**

```tsx
export function FeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3 px-4 sm:px-6 md:px-8 py-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/40 bg-card px-5 py-4 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-lg bg-muted" />
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="flex gap-2">
                <div className="h-5 bg-muted rounded-md w-16" />
                <div className="h-5 bg-muted rounded-md w-12" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

**Step 2: Integrate into FeedList**

In `feed-list.tsx`, show `<FeedSkeleton />` when items are loading (check if items array is empty and no error).

**Step 3: Commit**

```bash
git add components/feed-skeleton.tsx components/feed-list.tsx
git commit -m "feat: add skeleton loading states for feed"
```

---

### Task 17: Add empty states

**Files:**
- Create: `components/empty-state.tsx`

**Step 1: Create reusable empty state component**

```tsx
interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4 text-muted-foreground/40">
        {icon}
      </div>
      <h3 className="text-base font-medium text-foreground/70 mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground/50 max-w-xs">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
```

**Step 2: Use in FeedList, TodoList, and ProjectList**

- Feed empty: icon=FileText, "Capture your first thought", "Tap + to save an idea, link, image, or voice memo"
- Todos empty: icon=ListTodo, "All caught up!", "Your todo list is empty"
- Projects empty: icon=FolderOpen, "No projects yet", "Create a project to organize your items"

**Step 3: Commit**

```bash
git add components/empty-state.tsx components/feed-list.tsx components/todo-list.tsx
git commit -m "feat: add empty state illustrations for feed, todos, projects"
```

---

### Task 18: Improve error handling with retry

**Files:**
- Modify: `hooks/use-items.ts`

**Step 1: Add error state and retry logic to useItems hook**

```tsx
const [error, setError] = useState<string | null>(null)
const [loading, setLoading] = useState(true)

async function fetchItems() {
  setLoading(true)
  setError(null)
  try {
    const res = await fetch("/api/items?limit=50")
    if (!res.ok) throw new Error("Failed to load items")
    const data = await res.json()
    setItems(data)
  } catch (err) {
    setError("Could not load your items. Check your connection.")
    toast.error("Failed to load items")
  } finally {
    setLoading(false)
  }
}

return { refetch: fetchItems, loading, error }
```

**Step 2: Show error state in feed with retry button**

```tsx
{error && (
  <div className="text-center py-8">
    <p className="text-sm text-destructive mb-2">{error}</p>
    <button onClick={refetch} className="text-sm text-primary font-medium">
      Try again
    </button>
  </div>
)}
```

**Step 3: Commit**

```bash
git add hooks/use-items.ts components/feed-list.tsx
git commit -m "feat: add error handling with retry for feed loading"
```

---

## Phase 6: Performance

### Task 19: Add optimistic updates with rollback

**Files:**
- Modify: `components/feed-card.tsx`

**Step 1: Wrap pin/archive/delete with try-catch and rollback**

```tsx
async function handlePin() {
  const prev = item.is_pinned
  onUpdate(item.id, { is_pinned: !prev })  // Optimistic
  try {
    const res = await fetch(`/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_pinned: !prev }),
    })
    if (!res.ok) throw new Error()
    toast.success(!prev ? "Pinned" : "Unpinned")
  } catch {
    onUpdate(item.id, { is_pinned: prev })  // Rollback
    toast.error("Failed to update. Please try again.")
  }
}
```

Apply same pattern to `handleArchive` and delete.

**Step 2: Commit**

```bash
git add components/feed-card.tsx
git commit -m "feat: add optimistic updates with rollback for feed actions"
```

---

### Task 20: Implement infinite scroll

**Files:**
- Modify: `hooks/use-items.ts`
- Modify: `components/feed-list.tsx`

**Step 1: Add pagination state to useItems**

```tsx
const [hasMore, setHasMore] = useState(true)
const [offset, setOffset] = useState(0)
const PAGE_SIZE = 20

async function fetchItems() {
  // Initial load
  setOffset(0)
  setHasMore(true)
  const res = await fetch(`/api/items?limit=${PAGE_SIZE}&offset=0`)
  const data = await res.json()
  setItems(data)
  setHasMore(data.length === PAGE_SIZE)
}

async function loadMore() {
  const newOffset = offset + PAGE_SIZE
  const res = await fetch(`/api/items?limit=${PAGE_SIZE}&offset=${newOffset}`)
  const data = await res.json()
  set((s) => ({ items: [...s.items, ...data] }))
  setOffset(newOffset)
  setHasMore(data.length === PAGE_SIZE)
}
```

**Step 2: Add Intersection Observer trigger at bottom of feed**

In `feed-list.tsx`, add a sentinel div at the bottom. Use IntersectionObserver to call `loadMore` when it becomes visible.

```tsx
const sentinelRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  if (!sentinelRef.current || !hasMore) return
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) loadMore()
  }, { rootMargin: "200px" })
  observer.observe(sentinelRef.current)
  return () => observer.disconnect()
}, [hasMore, loadMore])

// At end of item list:
<div ref={sentinelRef} className="h-1" />
{!hasMore && items.length > 0 && (
  <p className="text-center text-xs text-muted-foreground/40 py-6">You've seen it all</p>
)}
```

**Step 3: Commit**

```bash
git add hooks/use-items.ts components/feed-list.tsx
git commit -m "feat: implement infinite scroll with pagination"
```

---

### Task 21: Add image lazy loading

**Files:**
- Modify: `components/image-card.tsx`
- Modify: `components/link-card.tsx`

**Step 1: Add loading="lazy" to all images**

In `image-card.tsx` and `link-card.tsx`, add `loading="lazy"` attribute to all `<img>` tags.

**Step 2: Commit**

```bash
git add components/image-card.tsx components/link-card.tsx
git commit -m "perf: add lazy loading to feed images"
```

---

## Phase 7: AI Enhancements

### Task 22: Add search result keyword highlighting

**Files:**
- Modify: `components/search-dialog.tsx`

**Step 1: Create highlight helper function**

```tsx
function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi")
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i} className="bg-primary/20 text-foreground rounded-sm px-0.5">{part}</mark> : part
  )
}
```

**Step 2: Apply to search result items**

Wrap displayed content/title text in search results with `highlightMatch(text, searchQuery)`.

**Step 3: Commit**

```bash
git add components/search-dialog.tsx
git commit -m "feat: add keyword highlighting in search results"
```

---

### Task 23: Make ChatPanel work in full-screen mobile mode

**Files:**
- Modify: `components/chat-panel.tsx`

**Step 1: Add fullScreen prop support**

When `fullScreen` is true:
- Render as a full-height div (not floating side panel)
- Remove the close (X) button
- Add `pb-16` for bottom nav padding
- Make input area fixed at bottom of container
- Keep all existing chat logic (sessions, messages, sources)

When `fullScreen` is false (desktop):
- Keep current side panel behavior unchanged

**Step 2: Commit**

```bash
git add components/chat-panel.tsx
git commit -m "feat: add full-screen mobile mode to ChatPanel"
```

---

### Task 24: Auto-summary for long text items

**Files:**
- Modify: `app/api/items/route.ts`

**Step 1: Trigger summary generation for long text items**

In the POST handler, after creating the item, if `type === "text"` and `content.length > 200`, fire-and-forget a summary request:

```tsx
if (type === "text" && content.length > 200) {
  fetch(`${req.nextUrl.origin}/api/ai/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: cookieHeader },
    body: JSON.stringify({ item_id: item.id, content }),
  }).catch(() => {})
}
```

**Step 2: Create summary API endpoint**

Create `app/api/ai/summarize/route.ts`:
- Accept `{ item_id, content }`
- Call Gemini with prompt: "Summarize in one concise sentence (max 100 chars): {content}"
- Update item's `summary` field via Supabase

**Step 3: Commit**

```bash
git add app/api/items/route.ts app/api/ai/summarize/route.ts
git commit -m "feat: auto-generate summaries for long text items"
```

---

## Phase 8: Final Polish

### Task 25: Add safe-area insets and viewport meta

**Files:**
- Modify: `app/layout.tsx`

**Step 1: Ensure viewport meta tag includes safe-area**

```tsx
export const metadata = {
  // ... existing
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
}
```

**Step 2: Add global CSS for safe areas**

```css
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
.safe-area-top {
  padding-top: env(safe-area-inset-top);
}
```

**Step 3: Commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat: add safe-area insets for notched devices"
```

---

### Task 26: Final integration test

**Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Test on mobile viewport**

Start dev server and test all flows in Chrome DevTools mobile viewport (375x812 iPhone):
1. Bottom tabs navigate correctly
2. FAB opens full-screen composer
3. Can create text, link, image items
4. Swipe left archives, swipe right pins
5. Long press shows context menu
6. Pull-to-refresh works
7. Infinite scroll loads more items
8. AI Chat tab works full-screen
9. More tab shows all secondary features
10. Toasts appear on actions
11. Empty states show when no data

**Step 3: Test on desktop viewport**

Verify desktop layout is unchanged:
1. Sidebar shows on left
2. No bottom tabs or FAB
3. Inline composer at top
4. Chat panel on right

**Step 4: Commit all remaining changes**

```bash
git add .
git commit -m "feat: complete mobile-first redesign v2"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1. Foundation | 1-2 | Install sonner, extend Zustand store |
| 2. Navigation | 3-9 | BottomNav, FAB, FilterChips, MobileHeader, MoreMenu, page restructure |
| 3. Composer | 10 | Full-screen MobileComposer |
| 4. Interactions | 11-14 | Swipe actions, pull-to-refresh, long-press menu |
| 5. Stability | 15-18 | Toasts, skeletons, empty states, error handling |
| 6. Performance | 19-21 | Optimistic updates, infinite scroll, lazy images |
| 7. AI | 22-24 | Search highlights, full-screen chat, auto-summary |
| 8. Polish | 25-26 | Safe areas, integration testing |

**Total: 26 tasks across 8 phases**
