"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useStore } from "@/lib/store"
import { ContentType } from "@/lib/supabase/types"
import { VoiceRecorder } from "@/components/voice-recorder"
import { toast } from "sonner"
import {
  FileText, Link, Image, Mic, X, Upload, Camera, ArrowUp, Loader2,
} from "lucide-react"
import { ScreenshotData } from "@/lib/supabase/types"
import { addToOfflineQueue, createOfflineItem } from "@/lib/offline-store"

const typeButtons: { type: ContentType; icon: React.ReactNode; label: string }[] = [
  { type: "text", icon: <FileText className="h-4 w-4" />, label: "Text" },
  { type: "link", icon: <Link className="h-4 w-4" />, label: "Link" },
  { type: "image", icon: <Image className="h-4 w-4" />, label: "Image" },
  { type: "voice", icon: <Mic className="h-4 w-4" />, label: "Voice" },
]

export function MobileComposer({ onSaved }: { onSaved?: () => void }) {
  const { setComposerOpen, addItem, updateItem, composerDefaultType, setComposerDefaultType, setJustSavedId } = useStore()
  const [content, setContent] = useState("")
  const [activeType, setActiveType] = useState<ContentType>(composerDefaultType || "text")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [hasCamera, setHasCamera] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [screenshotData, setScreenshotData] = useState<ScreenshotData | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)
  const isSubmittingRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Clear default type after using it
  useEffect(() => {
    if (composerDefaultType) setComposerDefaultType(null)
  }, [composerDefaultType, setComposerDefaultType])

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        setHasCamera(devices.some((d) => d.kind === "videoinput"))
      }).catch(() => setHasCamera(false))
    }
  }, [])

  useEffect(() => {
    if (activeType === "text" || activeType === "link") {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [activeType])

  function handleFileSelect(file: File) {
    if (!file.type.startsWith("image/")) return
    const MAX_FILE_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      toast.error("이미지 크기는 10MB 이하여야 합니다")
      return
    }
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setScreenshotData(null)

    // Analyze image with AI (screenshot detection + OCR)
    setIsAnalyzing(true)
    const formData = new FormData()
    formData.append("image", file)
    fetch("/api/ai/analyze-screenshot", { method: "POST", body: formData })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!data) return
        if (data.is_screenshot) {
          if (!content.trim()) setContent(data.content || data.summary || "")
          setScreenshotData({
            type: data.type,
            urls: data.extracted?.urls || [],
            dates: data.extracted?.dates || [],
            todos: data.extracted?.todos || [],
            people: data.extracted?.people || [],
            key_info: data.extracted?.key_info || [],
            expiry: data.extracted?.expiry || undefined,
          })
        } else {
          if (!content.trim()) setContent(data.summary || data.content || "")
        }
      })
      .catch(() => {})
      .finally(() => setIsAnalyzing(false))
  }

  function clearFile() {
    setSelectedFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setScreenshotData(null)
    setIsAnalyzing(false)
  }

  async function uploadImage(file: File): Promise<string | null> {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("bucket", "items-images")
    const res = await fetch("/api/upload", { method: "POST", body: formData })
    if (!res.ok) return null
    const { url } = await res.json()
    return url
  }

  async function uploadAudio(blob: Blob): Promise<string | null> {
    const formData = new FormData()
    formData.append("file", new File([blob], "recording.webm", { type: "audio/webm" }))
    formData.append("bucket", "items-audio")
    const res = await fetch("/api/upload", { method: "POST", body: formData })
    if (!res.ok) return null
    const { url } = await res.json()
    return url
  }

  async function handleVoiceRecorded(blob: Blob, duration: number) {
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    setIsSubmitting(true)
    const toastId = toast.loading("음성 메모 처리 중...")
    try {
      const fileUrl = await uploadAudio(blob)
      if (!fileUrl) {
        toast.error("업로드 실패", { id: toastId })
        return
      }

      toast.loading("음성을 텍스트로 변환 중...", { id: toastId })
      const formData = new FormData()
      formData.append("audio", blob, "recording.webm")
      const transcribeRes = await fetch("/api/ai/transcribe", { method: "POST", body: formData })
      let transcript = ""
      if (transcribeRes.ok) {
        const data = await transcribeRes.json()
        transcript = data.transcript || ""
      }

      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "voice",
          content: transcript || "Voice memo",
          metadata: { file_url: fileUrl, duration, transcript },
        }),
      })
      if (res.ok) {
        const item = await res.json()
        addItem({ ...item, tags: [] })
        toast.success("음성 메모 저장됨!", { id: toastId })
        setJustSavedId(item.id)
        setComposerOpen(false)
        onSaved?.()

        // AI tagging if transcript exists
        if (transcript) {
          fetch("/api/ai/tag", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ item_id: item.id, content: transcript, type: "voice" }),
          })
            .then(async (r) => {
              if (!r.ok) return
              const itemRes = await fetch(`/api/items/${item.id}`)
              if (!itemRes.ok) return
              const updated = await itemRes.json()
              updateItem(item.id, {
                summary: updated.summary,
                context: updated.context,
                tags: updated.tags || [],
                project_id: updated.project_id,
              })
            })
            .catch(console.error)
        }
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "음성 메모 저장에 실패했습니다", { id: toastId })
      }
    } catch {
      toast.error("음성 메모 저장에 실패했습니다")
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  function normalizeUrl(url: string): string {
    const trimmed = url.trim()
    if (!trimmed) return trimmed
    if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`
    return trimmed
  }

  function isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  async function handleSubmit() {
    if (isSubmittingRef.current) return

    if (activeType === "image") {
      if (!selectedFile) return
    } else if (activeType === "link") {
      const normalized = normalizeUrl(content)
      if (!normalized) return
      if (!isValidUrl(normalized)) {
        setLinkError("올바른 URL 형식이 아닙니다")
        return
      }
      setLinkError(null)
    } else {
      if (!content.trim()) return
      if (activeType === "text" && content.length > 50000) return
    }

    isSubmittingRef.current = true
    setIsSubmitting(true)
    const toastId = toast.loading(activeType === "image" ? "이미지 업로드 중..." : "저장 중...")
    try {
      let metadata = {}
      const submitContent = activeType === "link" ? normalizeUrl(content) : content.trim()

      if (activeType === "image" && selectedFile) {
        const imageUrl = await uploadImage(selectedFile)
        if (!imageUrl) {
          toast.error("이미지 업로드에 실패했습니다", { id: toastId })
          return
        }
        metadata = screenshotData
          ? { image_url: imageUrl, screenshot: screenshotData }
          : { image_url: imageUrl }
      }

      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activeType,
          content: activeType === "image" ? content.trim() || "Image" : submitContent,
          metadata,
        }),
      })
      if (res.ok) {
        const item = await res.json()
        addItem({ ...item, tags: [] })

        // If image saved without caption, analyze async and update
        const savedFile = activeType === "image" && !content.trim() ? selectedFile : null

        // For text/link: trigger AI tagging directly from client
        if (activeType !== "image") {
          const tagContent = activeType === "link" && item.metadata
            ? [item.metadata.og_title, item.metadata.og_description, item.content].filter(Boolean).join(" — ")
            : item.content
          fetch("/api/ai/tag", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ item_id: item.id, content: tagContent, type: activeType }),
          })
            .then(async (r) => {
              if (!r.ok) {
                console.error("AI tag failed:", r.status, await r.text().catch(() => ""))
                return
              }
              const itemRes = await fetch(`/api/items/${item.id}`)
              if (!itemRes.ok) return
              const updated = await itemRes.json()
              updateItem(item.id, {
                summary: updated.summary,
                context: updated.context,
                tags: updated.tags || [],
                project_id: updated.project_id,
              })
            })
            .catch((err) => console.error("AI tag error:", err))
        }

        setLinkError(null)
        const preview = activeType === "link"
          ? (item.metadata?.og_title || submitContent)
          : submitContent
        const previewText = typeof preview === "string" && preview.length > 40
          ? preview.slice(0, 40) + "..."
          : preview
        toast.success(`저장됨! ${previewText || ""}`, { id: toastId })
        setJustSavedId(item.id)
        setComposerOpen(false)
        onSaved?.()

        if (savedFile) {
          const fd = new FormData()
          fd.append("image", savedFile)
          fetch("/api/ai/analyze-screenshot", { method: "POST", body: fd })
            .then((r) => r.ok ? r.json() : null)
            .then((data) => {
              if (!data) return
              const newContent = data.is_screenshot
                ? (data.content || data.summary || "")
                : (data.summary || data.content || "")
              if (newContent) {
                const newMeta: Record<string, unknown> = {}
                if (data.is_screenshot) {
                  newMeta.screenshot = {
                    type: data.type,
                    urls: data.extracted?.urls || [],
                    dates: data.extracted?.dates || [],
                    todos: data.extracted?.todos || [],
                    people: data.extracted?.people || [],
                    key_info: data.extracted?.key_info || [],
                    expiry: data.extracted?.expiry || undefined,
                  }
                }
                updateItem(item.id, { content: newContent })
                fetch(`/api/items/${item.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    content: newContent,
                    ...(Object.keys(newMeta).length > 0 ? { metadata: { ...item.metadata, ...newMeta } } : {}),
                  }),
                }).then(() => {
                  fetch("/api/ai/tag", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ item_id: item.id, content: newContent, type: "image" }),
                  }).then(async (r) => {
                    if (!r.ok) return
                    const itemRes = await fetch(`/api/items/${item.id}`)
                    if (!itemRes.ok) return
                    const tagged = await itemRes.json()
                    updateItem(item.id, {
                      summary: tagged.summary,
                      context: tagged.context,
                      tags: tagged.tags || [],
                      project_id: tagged.project_id,
                    })
                  }).catch(() => {})
                }).catch(() => {})
              }
            })
            .catch(() => {})
        }
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "저장에 실패했습니다", {
          id: toastId,
          action: { label: "다시 시도", onClick: () => handleSubmit() },
          duration: 10000,
        })
      }
    } catch {
      // Offline fallback for text/link items
      if ((activeType === "text" || activeType === "link") && content.trim()) {
        try {
          const offlineItem = createOfflineItem(activeType, content.trim())
          await addToOfflineQueue(offlineItem)
          addItem(offlineItem)
          toast.success("오프라인에 저장됨. 온라인 복구 시 동기화됩니다.", { id: toastId, duration: 3000 })
          setComposerOpen(false)
          onSaved?.()
        } catch {
          toast.error("오프라인 저장에 실패했습니다", { id: toastId })
        }
      } else {
        toast.error("네트워크 오류. 다시 시도해주세요.", {
          id: toastId,
          action: { label: "다시 시도", onClick: () => handleSubmit() },
          duration: 10000,
        })
      }
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  const canSubmit =
    activeType === "voice"
      ? false
      : activeType === "image"
      ? !!selectedFile && !isSubmitting
      : !!content.trim() && !isSubmitting && (activeType !== "text" || content.length <= 50000)

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col md:hidden animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border/60 safe-area-top">
        <button
          onClick={() => setComposerOpen(false)}
          className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="text-sm font-medium text-foreground">새 기록</span>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50 disabled:pointer-events-none"
        >
          {isSubmitting ? (
            <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
          ) : (
            <>
              <ArrowUp className="h-4 w-4" />
              저장
            </>
          )}
        </button>
      </div>

      {/* Type Tabs */}
      <div className="flex border-b border-border/40">
        {typeButtons.map((btn) => (
          <button
            key={btn.type}
            onClick={() => { setActiveType(btn.type); clearFile() }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
              activeType === btn.type
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground/60"
            }`}
          >
            {btn.icon}
            {btn.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeType === "voice" ? (
          <div className="p-6">
            <VoiceRecorder onRecorded={handleVoiceRecorded} disabled={isSubmitting} />
          </div>
        ) : activeType === "image" ? (
          <div className="p-4 space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = "" }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = "" }}
            />

            {!selectedFile ? (
              <div className="flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-border/50">
                <div className="flex gap-3 mb-3">
                  {hasCamera && (
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium bg-primary/10 text-primary"
                    >
                      <Camera className="h-4 w-4" />
                      촬영
                    </button>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium bg-primary/10 text-primary"
                  >
                    <Upload className="h-4 w-4" />
                    갤러리
                  </button>
                </div>
                <p className="text-xs text-muted-foreground/40">이미지를 선택하세요</p>
              </div>
            ) : previewUrl ? (
              <div className="relative">
                <img src={previewUrl} alt="Preview" className="w-full max-h-64 object-contain rounded-xl bg-muted/30" />
                <button
                  onClick={clearFile}
                  className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded-full bg-black/50 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}

            {isAnalyzing && (
              <div className="flex items-center gap-2 text-sm text-primary/70">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>AI가 스크린샷을 분석하고 있습니다...</span>
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={isAnalyzing ? "분석 중..." : "설명을 추가하세요..."}
              className="w-full min-h-[60px] resize-none bg-transparent text-[15px] leading-relaxed focus:outline-none placeholder:text-muted-foreground/40"
            />
          </div>
        ) : activeType === "link" ? (
          <div className="p-4">
            <input
              ref={textareaRef as unknown as React.RefObject<HTMLInputElement>}
              type="url"
              value={content}
              onChange={(e) => { setContent(e.target.value); setLinkError(null) }}
              onKeyDown={(e) => { if (e.key === "Enter" && !isSubmittingRef.current) handleSubmit() }}
              onBlur={() => {
                if (content.trim()) {
                  const normalized = normalizeUrl(content)
                  setContent(normalized)
                  if (!isValidUrl(normalized)) {
                    setLinkError("올바른 URL 형식이 아닙니다")
                  } else {
                    setLinkError(null)
                  }
                }
              }}
              placeholder="URL을 붙여넣으세요..."
              className="w-full bg-transparent px-1 py-2 text-[15px] leading-relaxed focus:outline-none placeholder:text-muted-foreground/40"
            />
            {linkError && (
              <p className="text-xs text-destructive px-1 pt-1">{linkError}</p>
            )}
          </div>
        ) : (
          <div className="p-4">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="무엇을 기록할까요?"
              className="w-full min-h-[200px] resize-none bg-transparent text-[16px] leading-relaxed focus:outline-none placeholder:text-muted-foreground/40"
              autoFocus
            />
            {activeType === "text" && content.length > 40000 && (
              <p className={`text-xs pt-1 tabular-nums ${
                content.length > 50000 ? "text-destructive" : "text-muted-foreground/50"
              }`}>
                {content.length.toLocaleString()} / 50,000
              </p>
            )}
            {activeType === "text" && /^https?:\/\/[^\s]+$/.test(content.trim()) && (
              <button
                type="button"
                onClick={() => { setActiveType("link"); setLinkError(null) }}
                className="flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg text-xs bg-primary/5 text-primary/70 hover:bg-primary/10 transition-colors"
              >
                <Link className="h-3 w-3" />
                링크로 저장하시겠어요?
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
