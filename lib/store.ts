import { create } from "zustand"
import { Item, Tag, ContentType, Project, Todo } from "@/lib/supabase/types"

export type SortBy = "newest" | "oldest" | "type"
export type ViewMode = "list" | "timeline"
export type SidebarView = "feed" | "todos" | "insights"

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

  projects: Project[]
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  removeProject: (id: string) => void
  activeProject: string | null
  setActiveProject: (id: string | null) => void

  todos: Todo[]
  setTodos: (todos: Todo[]) => void
  addTodo: (todo: Todo) => void
  updateTodo: (id: string, updates: Partial<Todo>) => void
  removeTodo: (id: string) => void

  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  sidebarView: SidebarView
  setSidebarView: (view: SidebarView) => void

  smartFolder: string | null
  setSmartFolder: (folder: string | null) => void

  chatOpen: boolean
  setChatOpen: (open: boolean) => void

  composerOpen: boolean
  setComposerOpen: (open: boolean) => void
  activeTab: "feed" | "projects" | "todos" | "chat" | "more"
  setActiveTab: (tab: "feed" | "projects" | "todos" | "chat" | "more") => void
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

  projects: [],
  setProjects: (projects) => set({ projects }),
  addProject: (project) => set((s) => ({ projects: [project, ...s.projects] })),
  updateProject: (id, updates) =>
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  removeProject: (id) =>
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
  activeProject: null,
  setActiveProject: (activeProject) => set({ activeProject }),

  todos: [],
  setTodos: (todos) => set({ todos }),
  addTodo: (todo) => set((s) => ({ todos: [todo, ...s.todos] })),
  updateTodo: (id, updates) =>
    set((s) => ({
      todos: s.todos.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  removeTodo: (id) =>
    set((s) => ({ todos: s.todos.filter((t) => t.id !== id) })),

  viewMode: "list",
  setViewMode: (viewMode) => set({ viewMode }),
  sidebarView: "feed",
  setSidebarView: (sidebarView) => set({ sidebarView }),

  smartFolder: null,
  setSmartFolder: (smartFolder) => set({ smartFolder }),

  chatOpen: false,
  setChatOpen: (chatOpen) => set({ chatOpen }),

  composerOpen: false,
  setComposerOpen: (composerOpen) => set({ composerOpen }),
  activeTab: "feed",
  setActiveTab: (activeTab) => set({ activeTab }),
}))
