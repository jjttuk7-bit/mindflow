import { create } from "zustand"
import { Item, Tag, ContentType } from "@/lib/supabase/types"

interface MindflowStore {
  items: Item[]
  setItems: (items: Item[]) => void
  addItem: (item: Item) => void
  updateItem: (id: string, updates: Partial<Item>) => void
  removeItem: (id: string) => void

  tags: Tag[]
  setTags: (tags: Tag[]) => void

  activeFilter: ContentType | "all"
  setActiveFilter: (filter: ContentType | "all") => void
  activeTag: string | null
  setActiveTag: (tag: string | null) => void

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

  activeFilter: "all",
  setActiveFilter: (activeFilter) => set({ activeFilter }),
  activeTag: null,
  setActiveTag: (activeTag) => set({ activeTag }),

  searchQuery: "",
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}))
