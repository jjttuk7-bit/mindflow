"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { ContentType } from "@/lib/supabase/types"
import { createClient } from "@/lib/supabase/client"
import { VoiceRecorder } from "@/components/voice-recorder"
import { FileText, Link, Image, Mic, ArrowUp, Upload, X } from "lucide-react"

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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { addItem } = useStore()

  function handleFileSelect(file: File) {
    if (!file.type.startsWith("image/")) return
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  function clearFile() {
    setSelectedFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [])

  async function uploadImage(file: File): Promise<string | null> {
    const supabase = createClient()
    const ext = file.name.split(".").pop()
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage
      .from("items-images")
      .upload(path, file, { contentType: file.type })
    if (error) return null
    const { data } = supabase.storage.from("items-images").getPublicUrl(path)
    return data.publicUrl
  }

  async function uploadAudio(blob: Blob): Promise<string | null> {
    const supabase = createClient()
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.webm`
    const { error } = await supabase.storage
      .from("items-audio")
      .upload(path, blob, { contentType: "audio/webm" })
    if (error) return null
    const { data } = supabase.storage.from("items-audio").getPublicUrl(path)
    return data.publicUrl
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
        onSaved?.()
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
    try {
      let metadata = {}

      if (activeType === "image" && selectedFile) {
        const imageUrl = await uploadImage(selectedFile)
        if (!imageUrl) return
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
        setContent("")
        clearFile()
        onSaved?.()
      }
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
          {/* Drop zone */}
          {!selectedFile && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center h-32 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-200 ${
                isDragging
                  ? "border-primary/50 bg-primary/5"
                  : "border-border/50 hover:border-border hover:bg-muted/30"
              }`}
            >
              <Upload className="h-5 w-5 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground/50">
                Drop an image or <span className="text-primary/70 font-medium">browse</span>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileSelect(file)
                }}
              />
            </div>
          )}
          {/* Preview */}
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

      <div className="flex items-center justify-between px-3 pb-3">
        <div className="flex gap-0.5">
          {typeButtons.map((btn) => (
            <button
              key={btn.type}
              onClick={() => {
                setActiveType(btn.type)
                clearFile()
              }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                activeType === btn.type
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {btn.icon}
              <span>{btn.label}</span>
            </button>
          ))}
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          size="sm"
          className="rounded-lg h-8 px-3 gap-1.5 text-xs font-medium"
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
        </Button>
      </div>
    </div>
  )
}
