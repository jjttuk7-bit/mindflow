"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { Check, Trash2, Plus, Link as LinkIcon, Menu } from "lucide-react"
import { toast } from "sonner"

type TodoFilter = "all" | "active" | "completed"

export function TodoList({ onMenuClick }: { onMenuClick?: () => void }) {
  const { todos, addTodo, updateTodo, removeTodo, projects } = useStore()
  const [newContent, setNewContent] = useState("")
  const [filter, setFilter] = useState<TodoFilter>("all")

  const pendingCount = todos.filter((t) => !t.is_completed).length

  const filtered = todos.filter((t) => {
    if (filter === "active") return !t.is_completed
    if (filter === "completed") return t.is_completed
    return true
  })

  // Group by project
  const grouped = new Map<string | null, typeof filtered>()
  for (const todo of filtered) {
    const key = todo.project_id || null
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(todo)
  }

  function getProjectName(projectId: string | null) {
    if (!projectId) return "No Project"
    return projects.find((p) => p.id === projectId)?.name || "Unknown Project"
  }

  function getProjectColor(projectId: string | null) {
    if (!projectId) return "#888"
    return projects.find((p) => p.id === projectId)?.color || "#8B7355"
  }

  async function handleAdd() {
    if (!newContent.trim()) return
    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent.trim() }),
    })
    if (res.ok) {
      const todo = await res.json()
      addTodo(todo)
      toast.success("Todo added")
    }
    setNewContent("")
  }

  async function handleToggle(id: string, currentCompleted: boolean) {
    updateTodo(id, { is_completed: !currentCompleted })
    toast.success(!currentCompleted ? "Completed" : "Marked active")
    await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_completed: !currentCompleted }),
    })
  }

  async function handleDelete(id: string) {
    removeTodo(id)
    toast.success("Deleted")
    await fetch(`/api/todos/${id}`, { method: "DELETE" })
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
      {/* Mobile header with hamburger */}
      <div className="flex items-center gap-3 px-4 pt-4 md:hidden">
        <button
          onClick={onMenuClick}
          className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="font-display text-lg tracking-tight text-foreground">Mindflow</h1>
      </div>

      <div className="px-4 sm:px-6 md:px-8 pt-6 md:pt-8 pb-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-xl text-foreground">TODO</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {pendingCount} pending {pendingCount === 1 ? "task" : "tasks"}
              </p>
            </div>
          </div>

          {/* Add todo input */}
          <div className="flex items-center gap-2 mb-6">
            <input
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd() }}
              placeholder="Add a new todo..."
              className="flex-1 bg-muted/50 border border-border/60 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
            />
            <button
              onClick={handleAdd}
              disabled={!newContent.trim()}
              className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 mb-6">
            {(["all", "active", "completed"] as TodoFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-all duration-200 ${
                  filter === f
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Todo list */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8">
        <div className="max-w-2xl mx-auto space-y-6 pb-8">
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground/60 text-sm">
                {filter === "all"
                  ? "No todos yet. Add one above!"
                  : filter === "active"
                  ? "No active todos."
                  : "No completed todos."}
              </p>
            </div>
          )}

          {Array.from(grouped.entries()).map(([projectId, groupTodos]) => (
            <div key={projectId || "none"}>
              {grouped.size > 1 && (
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: getProjectColor(projectId) }}
                  />
                  <span className="text-[10px] tracking-[0.15em] uppercase font-semibold text-muted-foreground/70">
                    {getProjectName(projectId)}
                  </span>
                </div>
              )}
              <div className="space-y-1.5">
                {groupTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="group flex items-center gap-3 rounded-lg border border-border/40 bg-card px-4 py-3 transition-all hover:border-border/60"
                  >
                    <button
                      onClick={() => handleToggle(todo.id, todo.is_completed)}
                      className={`h-5 w-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        todo.is_completed
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border/60 hover:border-primary/50"
                      }`}
                    >
                      {todo.is_completed && <Check className="h-3 w-3" />}
                    </button>
                    <span
                      className={`flex-1 text-sm ${
                        todo.is_completed
                          ? "line-through text-muted-foreground/50"
                          : "text-foreground"
                      }`}
                    >
                      {todo.content}
                    </span>
                    {todo.item_id && (
                      <span className="text-muted-foreground/30 hover:text-primary transition-colors" title="Linked to an item">
                        <LinkIcon className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <button
                      onClick={() => handleDelete(todo.id)}
                      className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/30 hover:text-destructive hover:bg-destructive/5 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
