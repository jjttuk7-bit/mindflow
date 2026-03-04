"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Mic, Square, Play, Pause, Send, X, Loader2 } from "lucide-react"

interface VoiceRecorderProps {
  onRecorded: (blob: Blob, duration: number) => void
  disabled?: boolean
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

const MAX_DURATION = 5 * 60 // 5 minutes

export function VoiceRecorder({ onRecorded, disabled }: VoiceRecorderProps) {
  const [state, setState] = useState<"idle" | "recording" | "recorded">("idle")
  const [elapsed, setElapsed] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobRef = useRef<Blob | null>(null)

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
  }, [audioUrl])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        blobRef.current = blob
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setState("recorded")
        stream.getTracks().forEach((t) => t.stop())
      }

      mediaRecorder.start(100)
      setState("recording")
      setElapsed(0)
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev + 1 >= MAX_DURATION) {
            stopRecording()
            return prev
          }
          return prev + 1
        })
      }, 1000)
    } catch {
      // Microphone permission denied
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current)
    mediaRecorderRef.current?.stop()
  }

  function togglePlayback() {
    if (!audioUrl) return
    if (isPlaying) {
      audioRef.current?.pause()
      setIsPlaying(false)
    } else {
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      audio.onended = () => setIsPlaying(false)
      audio.play()
      setIsPlaying(true)
    }
  }

  function handleSend() {
    if (blobRef.current) {
      onRecorded(blobRef.current, elapsed)
      reset()
    }
  }

  function reset() {
    cleanup()
    setState("idle")
    setElapsed(0)
    setAudioUrl(null)
    setIsPlaying(false)
    blobRef.current = null
  }

  if (state === "idle") {
    return (
      <div className="flex flex-col items-center justify-center py-6 space-y-3">
        <button
          onClick={startRecording}
          disabled={disabled}
          className="relative w-16 h-16 rounded-full bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center transition-all duration-200 group"
        >
          <Mic className="h-6 w-6 text-destructive group-hover:scale-110 transition-transform" />
        </button>
        <p className="text-xs text-muted-foreground/50 italic">
          Tap to start recording
        </p>
      </div>
    )
  }

  if (state === "recording") {
    return (
      <div className="flex flex-col items-center justify-center py-6 space-y-3">
        <button
          onClick={stopRecording}
          className="relative w-16 h-16 rounded-full bg-destructive flex items-center justify-center transition-all duration-200 animate-pulse"
        >
          <Square className="h-5 w-5 text-white fill-white" />
          <span className="absolute inset-0 rounded-full border-2 border-destructive animate-ping opacity-30" />
        </button>
        <p className="text-sm font-mono text-destructive tabular-nums">
          {formatTime(elapsed)}
          <span className="text-muted-foreground/40"> / {formatTime(MAX_DURATION)}</span>
        </p>
        <p className="text-xs text-muted-foreground/50">
          {elapsed >= MAX_DURATION - 30 ? `${MAX_DURATION - elapsed}초 남음` : "Recording..."}
        </p>
      </div>
    )
  }

  // recorded
  return (
    <div className="flex flex-col items-center justify-center py-4 space-y-3">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-muted/40 border border-border/40">
        <button
          onClick={togglePlayback}
          className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 text-primary fill-primary" />
          ) : (
            <Play className="h-4 w-4 text-primary fill-primary ml-0.5" />
          )}
        </button>
        <div className="flex-1">
          <div className="h-1 bg-muted rounded-full w-32">
            <div className="h-full bg-primary/50 rounded-full" style={{ width: isPlaying ? "100%" : "0%", transition: isPlaying ? `width ${elapsed}s linear` : "none" }} />
          </div>
        </div>
        <span className="text-xs font-mono text-muted-foreground/60 tabular-nums">
          {formatTime(elapsed)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={reset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          <X className="h-3 w-3" />
          Discard
        </button>
        <button
          onClick={handleSend}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-primary/10 text-primary hover:bg-primary/20 font-medium transition-colors"
        >
          {disabled ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          {disabled ? "Transcribing..." : "Send"}
        </button>
      </div>
    </div>
  )
}
