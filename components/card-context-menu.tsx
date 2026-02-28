"use client"

import { Item } from "@/lib/supabase/types"
import { Pin, Archive, Trash2, Copy, Share2 } from "lucide-react"
import { toast } from "sonner"

interface CardContextMenuProps {
  item: Item | null
  onClose: () => void
  onPin: (item: Item) => void
  onArchive: (item: Item) => void
  onDelete: (id: string) => void
}

export function CardContextMenu({ item, onClose, onPin, onArchive, onDelete }: CardContextMenuProps) {
  if (!item) return null

  function handleCopy() {
    navigator.clipboard.writeText(item!.content)
    toast.success("Copied to clipboard")
    onClose()
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ text: item!.content }).catch(() => {})
      onClose()
    } else {
      handleCopy()
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl p-4 pb-8 safe-area-bottom animate-in slide-in-from-bottom duration-200">
        <div className="w-10 h-1 rounded-full bg-muted-foreground/20 mx-auto mb-4" />
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 px-2">{item.content}</p>
        <div className="space-y-1">
          <button
            onClick={() => { onPin(item); onClose() }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium hover:bg-accent transition-colors"
          >
            <Pin className={`h-4 w-4 ${item.is_pinned ? "fill-primary text-primary" : ""}`} />
            {item.is_pinned ? "Unpin" : "Pin to top"}
          </button>
          <button
            onClick={() => { onArchive(item); onClose() }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium hover:bg-accent transition-colors"
          >
            <Archive className="h-4 w-4" />
            {item.is_archived ? "Unarchive" : "Archive"}
          </button>
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium hover:bg-accent transition-colors"
          >
            <Copy className="h-4 w-4" />
            Copy text
          </button>
          <button
            onClick={handleShare}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium hover:bg-accent transition-colors"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
          <button
            onClick={() => { onDelete(item.id); onClose() }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
        <button
          onClick={onClose}
          className="w-full mt-3 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
        >
          Cancel
        </button>
      </div>
    </>
  )
}
