"use client"

import { useState } from "react"
import Image from "next/image"
import dynamic from "next/dynamic"
import { ScreenshotData } from "@/lib/supabase/types"
import { ExternalLink, CheckSquare, Clock, User, Info, RefreshCw } from "lucide-react"
import { toast } from "sonner"

const ImageLightbox = dynamic(() => import("@/components/image-lightbox").then(m => m.ImageLightbox), { ssr: false })

const screenshotTypeLabels: Record<string, { label: string; color: string }> = {
  tweet: { label: "Tweet", color: "bg-sky-500/10 text-sky-600" },
  chat: { label: "Chat", color: "bg-violet-500/10 text-violet-600" },
  article: { label: "Article", color: "bg-emerald-500/10 text-emerald-600" },
  recipe: { label: "Recipe", color: "bg-orange-500/10 text-orange-600" },
  code: { label: "Code", color: "bg-slate-500/10 text-slate-600" },
  whiteboard: { label: "Whiteboard", color: "bg-amber-500/10 text-amber-600" },
  email: { label: "Email", color: "bg-blue-500/10 text-blue-600" },
  shopping: { label: "Shopping", color: "bg-pink-500/10 text-pink-600" },
  map: { label: "Map", color: "bg-teal-500/10 text-teal-600" },
  other: { label: "Screenshot", color: "bg-gray-500/10 text-gray-600" },
}

export function ImageCard({
  imageUrl,
  caption,
  screenshot: initialScreenshot,
  itemId,
  onScreenshotUpdate,
}: {
  imageUrl: string
  caption?: string
  screenshot?: ScreenshotData
  itemId?: string
  onScreenshotUpdate?: (screenshot: ScreenshotData) => void
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [reanalyzing, setReanalyzing] = useState(false)
  const [screenshot, setScreenshot] = useState(initialScreenshot)
  const [hovered, setHovered] = useState(false)

  const typeInfo = screenshot ? screenshotTypeLabels[screenshot.type] || screenshotTypeLabels.other : null

  const handleReanalyze = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!itemId || reanalyzing) return
    setReanalyzing(true)
    try {
      // Fetch image and convert to base64
      const imgRes = await fetch(imageUrl)
      const blob = await imgRes.blob()
      const formData = new FormData()
      formData.append("image", new File([blob], "image.jpg", { type: blob.type }))

      // Re-analyze
      const analysisRes = await fetch("/api/ai/analyze-screenshot", {
        method: "POST",
        body: formData,
      })
      if (!analysisRes.ok) throw new Error("Analysis failed")
      const analysis = await analysisRes.json()

      const newScreenshot: ScreenshotData = {
        type: analysis.type || "other",
        urls: analysis.extracted?.urls || [],
        dates: analysis.extracted?.dates || [],
        todos: analysis.extracted?.todos || [],
        people: analysis.extracted?.people || [],
        key_info: analysis.extracted?.key_info || [],
        expiry: analysis.extracted?.expiry,
      }

      // Update item metadata
      const patchRes = await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: { image_url: imageUrl, screenshot: newScreenshot },
        }),
      })

      if (patchRes.ok) {
        setScreenshot(newScreenshot)
        onScreenshotUpdate?.(newScreenshot)
        toast.success("재분석 완료!")
      } else {
        throw new Error("Update failed")
      }
    } catch {
      toast.error("재분석 실패")
    } finally {
      setReanalyzing(false)
    }
  }

  return (
    <>
      <div
        className="space-y-2"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Screenshot type badge + re-analyze button */}
        <div className="flex items-center gap-1.5">
          {screenshot && typeInfo && (
            <span className={`inline-flex items-center gap-1 text-ui-xs tracking-wide px-2 py-0.5 rounded-md font-semibold ${typeInfo.color}`}>
              {typeInfo.label}
            </span>
          )}
          {itemId && hovered && (
            <button
              onClick={handleReanalyze}
              disabled={reanalyzing}
              title="재분석"
              className="inline-flex items-center gap-1 text-ui-xs px-1.5 py-0.5 rounded-md text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 transition-all"
            >
              <RefreshCw className={`h-3 w-3 ${reanalyzing ? "animate-spin" : ""}`} />
              {reanalyzing ? "분석 중..." : "재분석"}
            </button>
          )}
        </div>

        <button
          onClick={() => setLightboxOpen(true)}
          className="block w-full rounded-lg overflow-hidden bg-muted/30 border border-border/30 hover:border-border/60 transition-all duration-200 cursor-zoom-in"
        >
          <Image
            src={imageUrl}
            alt={caption || "Uploaded image"}
            width={600}
            height={256}
            sizes="(max-width: 768px) 100vw, 600px"
            className="w-full max-h-64 object-cover"
          />
        </button>

        {caption && (
          <p className="text-ui-base leading-relaxed whitespace-pre-wrap break-words text-foreground/90 line-clamp-4">
            {caption}
          </p>
        )}

        {/* Screenshot extracted info */}
        {screenshot && (
          <div className="space-y-1.5 pt-1">
            {/* Extracted URLs */}
            {screenshot.urls.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {screenshot.urls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-ui-sm text-primary/70 hover:text-primary bg-primary/5 hover:bg-primary/10 rounded-md px-2 py-0.5 transition-colors truncate max-w-[240px]"
                  >
                    <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                    {url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40)}
                  </a>
                ))}
              </div>
            )}

            {/* TODOs */}
            {screenshot.todos.length > 0 && (
              <div className="space-y-0.5">
                {screenshot.todos.map((todo, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-ui-sm text-foreground/70">
                    <CheckSquare className="h-3 w-3 mt-0.5 text-primary/50 shrink-0" />
                    <span>{todo}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Key info chips (dates, people, key_info) */}
            {(screenshot.dates.length > 0 || screenshot.people.length > 0 || screenshot.key_info.length > 0) && (
              <div className="flex flex-wrap gap-1">
                {screenshot.dates.map((d, i) => (
                  <span key={`d${i}`} className="inline-flex items-center gap-1 text-ui-xs bg-amber-500/8 text-amber-700 dark:text-amber-400 rounded-md px-1.5 py-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {d}
                  </span>
                ))}
                {screenshot.people.map((p, i) => (
                  <span key={`p${i}`} className="inline-flex items-center gap-1 text-ui-xs bg-violet-500/8 text-violet-700 dark:text-violet-400 rounded-md px-1.5 py-0.5">
                    <User className="h-2.5 w-2.5" />
                    {p}
                  </span>
                ))}
                {screenshot.key_info.map((k, i) => (
                  <span key={`k${i}`} className="inline-flex items-center gap-1 text-ui-xs bg-emerald-500/8 text-emerald-700 dark:text-emerald-400 rounded-md px-1.5 py-0.5">
                    <Info className="h-2.5 w-2.5" />
                    {k}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <ImageLightbox
        src={imageUrl}
        alt={caption || "Image"}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  )
}
