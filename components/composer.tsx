"use client"

import { useState, useRef, useCallback, useEffect } from "react"
// Button replaced with native button for better mobile touch handling
import { useStore } from "@/lib/store"
import { toast } from "sonner"
import { ContentType } from "@/lib/supabase/types"
import { addToOfflineQueue, createOfflineItem } from "@/lib/offline-store"
import { VoiceRecorder } from "@/components/voice-recorder"
import { FileText, Link, Image, Mic, ArrowUp, Upload, X, Camera, Loader2 } from "lucide-react"
import { ScreenshotData } from "@/lib/supabase/types"

const typeButtons: {
  type: ContentType
  icon: React.ReactNode
  label: string
}[] = [
  { type: "text", icon: <FileText className="h-3.5 w-3.5" />, label: "Text" },
  { type: "link", icon: <Link className="h-3.5 w-3.5" />, label: "Link" },
  { type: "image", icon: <Image className="h-3.5 w-3.5" />, label: "Image" },
  { type: "voice", icon: <Mic className="h-3.5 w-3.5" />, label: "Voice" },
]

export function Composer({ onSaved }: { onSaved?: () => void }) {
  const [content, setContent] = useState("")
  const [activeType, setActiveType] = useState<ContentType>("text")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [hasCamera, setHasCamera] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [screenshotData, setScreenshotData] = useState<ScreenshotData | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isSubmittingRef = useRef(false)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const { addItem, updateItem, setJustSavedId } = useStore()

  // Detect camera availability
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        setHasCamera(devices.some((d) => d.kind === "videoinput"))
      }).catch(() => setHasCamera(false))
    }
  }, [])

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
          setContent(data.content || data.summary || "")
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
          setContent(data.summary || data.content || "")
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

  function handleTakePhoto() {
    if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
      cameraInputRef.current?.click()
    } else {
      startCamera()
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      setCameraStream(stream)
      setShowCamera(true)
    } catch {
      cameraInputRef.current?.click()
    }
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop())
    }
    setCameraStream(null)
    setShowCamera(false)
  }

  function capturePhoto() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext("2d")?.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `photo-${Date.now()}.jpg`, {
            type: "image/jpeg",
          })
          handleFileSelect(file)
          stopCamera()
        }
      },
      "image/jpeg",
      0.9
    )
  }

  // Attach camera stream to video element & cleanup on stream change/unmount
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream
    }
    return () => {
      cameraStream?.getTracks().forEach((t) => t.stop())
    }
  }, [cameraStream])

  // Stop camera when switching away from image mode
  useEffect(() => {
    if (activeType !== "image") {
      setCameraStream((prev) => {
        prev?.getTracks().forEach((t) => t.stop())
        return null
      })
      setShowCamera(false)
    }
  }, [activeType])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [])

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
      // Upload audio file
      const fileUrl = await uploadAudio(blob)
      if (!fileUrl) {
        toast.error("업로드 실패", { id: toastId })
        return
      }

      // Transcribe via Whisper
      toast.loading("음성을 텍스트로 변환 중...", { id: toastId })
      const formData = new FormData()
      formData.append("audio", blob, "recording.webm")
      const transcribeRes = await fetch("/api/ai/transcribe", {
        method: "POST",
        body: formData,
      })
      let transcript = ""
      if (transcribeRes.ok) {
        const data = await transcribeRes.json()
        transcript = data.transcript || ""
      }

      // Save item
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
    setError(null)
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

        setContent("")
        clearFile()
        setLinkError(null)
        const preview = activeType === "link"
          ? (item.metadata?.og_title || submitContent)
          : submitContent
        const previewText = typeof preview === "string" && preview.length > 40
          ? preview.slice(0, 40) + "..."
          : preview
        toast.success(`저장됨! ${previewText || ""}`, { id: toastId })
        setJustSavedId(item.id)
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
          setContent("")
          toast.success("오프라인에 저장됨. 온라인 복구 시 동기화됩니다.", { id: toastId, duration: 3000 })
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!isSubmittingRef.current) handleSubmit()
    }
  }

  const canSubmit =
    activeType === "voice"
      ? false // Voice uses its own send button
      : activeType === "image"
      ? !!selectedFile && !isSubmitting
      : !!content.trim() && !isSubmitting && (activeType !== "text" || content.length <= 50000)

  return (
    <div
      className={`rounded-xl border bg-card transition-all duration-300 ${
        isFocused || isDragging
          ? "shadow-[0_2px_20px_-4px_oklch(0.62_0.14_40/0.12)] border-primary/30"
          : "shadow-sm border-border/60 hover:border-border"
      }`}
    >
      {/* Input area changes based on type */}
      {activeType === "voice" ? (
        <VoiceRecorder onRecorded={handleVoiceRecorded} disabled={isSubmitting} />
      ) : activeType === "link" ? (
        <div>
          <input
            type="url"
            value={content}
            onChange={(e) => { setContent(e.target.value); setLinkError(null) }}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false)
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
            className="w-full bg-transparent px-5 py-4 text-[15px] leading-relaxed focus:outline-none placeholder:text-muted-foreground/40 placeholder:italic"
            disabled={isSubmitting}
          />
          {linkError && (
            <p className="text-xs text-destructive px-5 pb-1">{linkError}</p>
          )}
        </div>
      ) : activeType === "image" ? (
        <div className="px-5 pt-4 pb-2 space-y-3">
          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
              e.target.value = ""
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
              e.target.value = ""
            }}
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Option buttons + drop zone */}
          {!selectedFile && !showCamera && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center h-32 rounded-lg border-2 border-dashed transition-all duration-200 ${
                isDragging
                  ? "border-primary/50 bg-primary/5"
                  : "border-border/50 hover:border-border/80"
              }`}
            >
              <div className="flex gap-3 mb-2">
                {hasCamera && (
                  <button
                    type="button"
                    onClick={handleTakePhoto}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Camera className="h-4 w-4" />
                    촬영
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  업로드
                </button>
              </div>
              <p className="text-xs text-muted-foreground/40">
                또는 여기에 이미지를 드래그하세요
              </p>
            </div>
          )}

          {/* Desktop camera preview */}
          {showCamera && (
            <div className="space-y-2">
              <div className="relative rounded-lg overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full max-h-48 object-cover"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Camera className="h-4 w-4" />
                  저장
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  <X className="h-4 w-4" />
                  취소
                </button>
              </div>
            </div>
          )}

          {/* Image preview */}
          {selectedFile && previewUrl && (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full max-h-48 object-cover rounded-lg"
              />
              <button
                onClick={clearFile}
                className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Analyzing indicator */}
          {isAnalyzing && (
            <div className="flex items-center gap-2 text-sm text-primary/70">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>AI가 스크린샷을 분석하고 있습니다...</span>
            </div>
          )}

          {/* Caption */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={isAnalyzing ? "분석 중..." : "설명을 추가하세요..."}
            className="w-full min-h-[44px] resize-none bg-transparent text-[15px] leading-relaxed focus:outline-none placeholder:text-muted-foreground/40 placeholder:italic"
            disabled={isSubmitting}
          />
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="무엇을 기록할까요?"
          className="w-full min-h-[88px] resize-none bg-transparent px-5 pt-4 pb-2 text-[15px] leading-relaxed focus:outline-none placeholder:text-muted-foreground/40 placeholder:italic"
          disabled={isSubmitting}
        />
      )}

      {activeType === "text" && content.length > 40000 && (
        <p className={`text-xs px-5 pb-1 tabular-nums ${
          content.length > 50000 ? "text-destructive" : "text-muted-foreground/50"
        }`}>
          {content.length.toLocaleString()} / 50,000
        </p>
      )}

      {activeType === "text" && /^https?:\/\/[^\s]+$/.test(content.trim()) && (
        <button
          type="button"
          onClick={() => { setActiveType("link"); setLinkError(null) }}
          className="flex items-center gap-1.5 mx-5 mb-2 px-3 py-1.5 rounded-lg text-xs bg-primary/5 text-primary/70 hover:bg-primary/10 transition-colors"
        >
          <Link className="h-3 w-3" />
          링크로 저장하시겠어요?
        </button>
      )}

      {error && (
        <p className="text-xs text-destructive px-4 pb-1">{error}</p>
      )}
      <div className="flex items-center justify-between px-3 pb-3">
        <div className="flex gap-0.5">
          {typeButtons.map((btn) => (
            <button
              key={btn.type}
              type="button"
              onClick={() => {
                setActiveType(btn.type)
                clearFile()
                setError(null)
                setLinkError(null)
              }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                activeType === btn.type
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {btn.icon}
              <span className="hidden sm:inline">{btn.label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onPointerDown={(e) => { e.preventDefault(); if (canSubmit) handleSubmit() }}
          disabled={!canSubmit}
          className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg h-10 sm:h-8 px-4 sm:px-3 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 transition-all touch-manipulation"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
              저장 중
            </span>
          ) : (
            <>
              <ArrowUp className="h-3.5 w-3.5" />
              저장
            </>
          )}
        </button>
      </div>
    </div>
  )
}
