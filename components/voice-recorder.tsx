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
  const [micLevel, setMicLevel] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobRef = useRef<Blob | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)
  const levelsRef = useRef<number[]>([])

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    analyserRef.current = null
  }, [audioUrl])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  // Mic level monitoring during recording
  function startLevelMonitor(stream: MediaStream) {
    const audioCtx = new AudioContext()
    const source = audioCtx.createMediaStreamSource(stream)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    analyserRef.current = analyser

    const data = new Uint8Array(analyser.frequencyBinCount)
    function tick() {
      analyser.getByteFrequencyData(data)
      const avg = data.reduce((a, b) => a + b, 0) / data.length / 255
      setMicLevel(avg)
      levelsRef.current.push(avg)
      // Keep last 200 samples for waveform preview
      if (levelsRef.current.length > 200) levelsRef.current.shift()
      animFrameRef.current = requestAnimationFrame(tick)
    }
    tick()
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      levelsRef.current = []

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
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        setMicLevel(0)
      }

      startLevelMonitor(stream)
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
    setMicLevel(0)
    blobRef.current = null
    levelsRef.current = []
  }

  // Mic level indicator color
  const levelColor =
    micLevel > 0.6 ? "bg-red-500" :
    micLevel > 0.3 ? "bg-amber-500" :
    micLevel > 0.05 ? "bg-green-500" :
    "bg-muted-foreground/20"

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
          탭하여 녹음 시작
        </p>
      </div>
    )
  }

  if (state === "recording") {
    return (
      <div className="flex flex-col items-center justify-center py-6 space-y-3">
        <button
          onClick={stopRecording}
          className="relative w-16 h-16 rounded-full bg-destructive flex items-center justify-center transition-all duration-200"
          style={{
            boxShadow: `0 0 0 ${Math.round(micLevel * 20)}px rgba(239, 68, 68, ${0.1 + micLevel * 0.15})`,
          }}
        >
          <Square className="h-5 w-5 text-white fill-white" />
        </button>

        {/* Live waveform bars */}
        <div className="flex items-center justify-center gap-[2px] h-8 w-48">
          {Array.from({ length: 24 }).map((_, i) => {
            const idx = Math.floor((levelsRef.current.length / 24) * i)
            const val = levelsRef.current[idx] || 0
            return (
              <div
                key={i}
                className="w-1 rounded-full bg-destructive/60 transition-all duration-75"
                style={{ height: `${Math.max(4, val * 28)}px` }}
              />
            )
          })}
        </div>

        {/* Mic level indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full transition-colors ${levelColor}`} />
            <span className="text-ui-xs text-muted-foreground/50">
              {micLevel > 0.3 ? "양호" : micLevel > 0.05 ? "보통" : "약함"}
            </span>
          </div>
          <span className="text-sm font-mono text-destructive tabular-nums">
            {formatTime(elapsed)}
            <span className="text-muted-foreground/40"> / {formatTime(MAX_DURATION)}</span>
          </span>
        </div>

        <p className="text-xs text-muted-foreground/50">
          {elapsed >= MAX_DURATION - 30 ? `${MAX_DURATION - elapsed}초 남음` : "녹음 중..."}
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
          삭제
        </button>
        <button
          onClick={handleSend}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-primary/10 text-primary hover:bg-primary/20 font-medium transition-colors"
        >
          {disabled ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          {disabled ? "전사 중..." : "보내기"}
        </button>
      </div>
    </div>
  )
}
