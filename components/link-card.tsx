"use client"

import { LinkMeta } from "@/lib/supabase/types"
import { ExternalLink, Globe } from "lucide-react"

export function LinkCard({
  url,
  meta,
}: {
  url: string
  meta: LinkMeta
}) {
  const domain = meta.og_domain || new URL(url).hostname.replace("www.", "")

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-4 rounded-lg border border-border/40 bg-muted/30 p-3 hover:bg-muted/60 hover:border-border transition-all duration-200"
    >
      {meta.og_image && (
        <div className="shrink-0 w-20 h-20 rounded-md overflow-hidden bg-muted">
          <img
            src={meta.og_image}
            alt={meta.og_title || ""}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        {meta.og_title && (
          <p className="text-sm font-medium leading-snug line-clamp-1 text-foreground/90 group-hover:text-foreground">
            {meta.og_title}
          </p>
        )}
        {meta.og_description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {meta.og_description}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-0.5">
          <Globe className="h-3 w-3 text-muted-foreground/50" />
          <span className="text-[11px] text-muted-foreground/60">{domain}</span>
          <ExternalLink className="h-2.5 w-2.5 text-muted-foreground/30 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </a>
  )
}
