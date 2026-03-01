"use client"

import { useState, useRef, useCallback, useEffect } from "react"
// Button replaced with native button for better mobile touch handling
import { useStore } from "@/lib/store"
import { toast } from "sonner"
import { ContentType } from "@/lib/supabase/types"
import { VoiceRecorder } from "@/components/voice-recorder"
import { FileText, Link, Image, Mic, ArrowUp, Upload, X, Camera } from "lucide-react"

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
  const [hasCamera, setHasCamera] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const { addItem, updateItem } = useStore()

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
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))

    // Auto-describe image with AI
    const formData = new FormData()
    formData.append("image", file)
    fetch("/api/ai/describe-image", { method: "POST", body: formData })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.description) setContent(data.description)
      })
      .catch(() => {})
  }

  function clearFile() {
    setSelectedFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
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
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(`Upload failed: ${data.error || res.statusText}`)
      return null
    }
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
    setIsSubmitting(true)
    try {
      // Upload audio file
      const fileUrl = await uploadAudio(blob)
      if (!fileUrl) return

      // Transcribe via Whisper
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
        toast.success("Voice memo saved!")
        onSaved?.()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Failed to save voice memo")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSubmit() {
    if (activeType === "image") {
      if (!selectedFile) return
    } else {
      if (!content.trim()) return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      let metadata = {}

      if (activeType === "image" && selectedFile) {
        const imageUrl = await uploadImage(selectedFile)
        if (!imageUrl) {
          setError("Failed to upload image")
          return
        }
        metadata = { image_url: imageUrl }
      }

      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activeType,
          content: activeType === "image" ? content.trim() || "Image" : content.trim(),
          metadata,
        }),
      })
      if (res.ok) {
        const item = await res.json()
        addItem({ ...item, tags: [] })

        // If image saved without caption, generate caption async and update
        const savedFile = activeType === "image" && !content.trim() ? selectedFile : null

        setContent("")
        clearFile()
        toast.success("Saved!")
        onSaved?.()

        if (savedFile) {
          const fd = new FormData()
          fd.append("image", savedFile)
          fetch("/api/ai/describe-image", { method: "POST", body: fd })
            .then((r) => r.ok ? r.json() : null)
            .then((data) => {
              if (data?.description) {
                updateItem(item.id, { content: data.description })
                fetch(`/api/items/${item.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ content: data.description }),
                }).then(() => {
                  // Re-trigger tagging with actual caption
                  fetch("/api/ai/tag", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ item_id: item.id, content: data.description, type: "image" }),
                  }).catch(() => {})
                }).catch(() => {})
              }
            })
            .catch(() => {})
        }
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || `Save failed (${res.status})`)
      }
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const canSubmit =
    activeType === "voice"
      ? false // Voice uses its own send button
      : activeType === "image"
      ? !!selectedFile && !isSubmitting
      : !!content.trim() && !isSubmitting

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
        <input
          type="url"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Paste a URL..."
          className="w-full bg-transparent px-5 py-4 text-[15px] leading-relaxed focus:outline-none placeholder:text-muted-foreground/40 placeholder:italic"
          disabled={isSubmitting}
        />
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
                    Take Photo
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Upload
                </button>
              </div>
              <p className="text-xs text-muted-foreground/40">
                or drag & drop an image here
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
                  Capture
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  <X className="h-4 w-4" />
                  Cancel
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

          {/* Caption */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Add a caption..."
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
          placeholder="What's on your mind?"
          className="w-full min-h-[88px] resize-none bg-transparent px-5 pt-4 pb-2 text-[15px] leading-relaxed focus:outline-none placeholder:text-muted-foreground/40 placeholder:italic"
          disabled={isSubmitting}
        />
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
              Saving
            </span>
          ) : (
            <>
              <ArrowUp className="h-3.5 w-3.5" />
              Save
            </>
          )}
        </button>
      </div>
    </div>
  )
}
