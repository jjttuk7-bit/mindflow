"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { FolderOpen, Plus, Check, X, Trash2 } from "lucide-react"
import { EmptyState } from "@/components/empty-state"

export function MobileProjectList() {
  const {
    projects, items, addProject, removeProject,
    setActiveProject, setActiveTab,
  } = useStore()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")

  function getItemCount(projectId: string) {
    return items.filter((i) => i.project_id === projectId).length
  }

  async function handleCreate() {
    if (!newName.trim()) return
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    })
    if (res.ok) {
      const project = await res.json()
      addProject(project)
    }
    setNewName("")
    setCreating(false)
  }

  async function handleDelete(id: string) {
    await fetch(`/api/projects/${id}`, { method: "DELETE" })
    removeProject(id)
  }

  function handleSelect(id: string) {
    setActiveProject(id)
    setActiveTab("feed")
  }

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h2 className="font-display text-xl tracking-tight text-foreground">Projects</h2>
        <button
          onClick={() => setCreating(true)}
          className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-20">
        {creating && (
          <div className="flex items-center gap-2 mb-3 p-3 rounded-xl border border-border/60 bg-card">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate()
                if (e.key === "Escape") { setCreating(false); setNewName("") }
              }}
              placeholder="Project name..."
              className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none"
            />
            <button onClick={handleCreate} className="h-8 w-8 flex items-center justify-center rounded-lg text-primary hover:bg-primary/10">
              <Check className="h-4 w-4" />
            </button>
            <button onClick={() => { setCreating(false); setNewName("") }} className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {projects.length === 0 && !creating ? (
          <EmptyState
            icon={<FolderOpen className="h-8 w-8" />}
            title="No projects yet"
            description="Create a project to organize your items by topic"
            action={{ label: "New Project", onClick: () => setCreating(true) }}
          />
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <div key={project.id} className="group flex items-center gap-3 rounded-xl border border-border/40 bg-card px-4 py-3.5 active:bg-accent/50 transition-colors">
                <button
                  onClick={() => handleSelect(project.id)}
                  className="flex-1 flex items-center gap-3 min-w-0"
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="truncate text-sm font-medium">{project.name}</span>
                  <span className="text-xs text-muted-foreground/50 tabular-nums ml-auto shrink-0">
                    {getItemCount(project.id)} items
                  </span>
                </button>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground/30 hover:text-destructive hover:bg-destructive/5 md:opacity-0 md:group-hover:opacity-100 transition-all shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
