import { create } from "zustand"
import { Item, Tag, ContentType } from "@/lib/supabase/types"

export type SortBy = "newest" | "oldest" | "type"

interface MindflowStore {
  items: Item[]
  setItems: (items: Item[]) => void
  addItem: (item: Item) => void
  updateItem: (id: string, updates: Partial<Item>) => void
  removeItem: (id: string) => void

  tags: Tag[]
  setTags: (tags: Tag[]) => void
  removeTag: (id: string) => void
  renameTag: (id: string, name: string) => void

  activeFilter: ContentType | "all"
  setActiveFilter: (filter: ContentType | "all") => void
  activeTag: string | null
  setActiveTag: (tag: string | null) => void

  sortBy: SortBy
  setSortBy: (sort: SortBy) => void
  showArchived: boolean
  setShowArchived: (show: boolean) => void

  searchQuery: string
  setSearchQuery: (query: string) => void
}

export const useStore = create<MindflowStore>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
  addItem: (item) => set((s) => ({ items: [item, ...s.items] })),
  updateItem: (id, updates) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    })),
  removeItem: (id) =>
    set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

  tags: [],
  setTags: (tags) => set({ tags }),
  removeTag: (id) =>
    set((s) => ({ tags: s.tags.filter((t) => t.id !== id) })),
  renameTag: (id, name) =>
    set((s) => ({
      tags: s.tags.map((t) => (t.id === id ? { ...t, name } : t)),
      items: s.items.map((item) => ({
        ...item,
        tags: item.tags?.map((t) => (t.id === id ? { ...t, name } : t)),
      })),
    })),

  activeFilter: "all",
  setActiveFilter: (activeFilter) => set({ activeFilter }),
  activeTag: null,
  setActiveTag: (activeTag) => set({ activeTag }),

  sortBy: "newest",
  setSortBy: (sortBy) => set({ sortBy }),
  showArchived: false,
  setShowArchived: (showArchived) => set({ showArchived }),

  searchQuery: "",
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}))
