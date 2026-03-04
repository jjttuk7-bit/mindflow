"use client"

import { useState, useRef } from "react"
import { Play, Pause, Copy, Check, Share2, Download } from "lucide-react"

interface VoiceCardProps {
  fileUrl: string
  duration: number
  transcript?: string
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function VoiceCard({ fileUrl, duration, transcript }: VoiceCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  function togglePlay() {
    if (isPlaying) {
      audioRef.current?.pause()
      setIsPlaying(false)
    } else {
      if (!audioRef.current) {
        const audio = new Audio(fileUrl)
        audioRef.current = audio
        audio.ontimeupdate = () => {
          setProgress((audio.currentTime / audio.duration) * 100)
          setCurrentTime(audio.currentTime)
        }
        audio.onended = () => {
          setIsPlaying(false)
          setProgress(0)
          setCurrentTime(0)
          audioRef.current = null
        }
      }
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    if (!audioRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    audioRef.current.currentTime = pct * audioRef.current.duration
  }

  return (
    <div className="space-y-2.5">
      {/* Player */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/30 border border-border/30">
        <button
          onClick={togglePlay}
          className="h-9 w-9 rounded-full bg-amber-accent/10 flex items-center justify-center hover:bg-amber-accent/20 transition-colors shrink-0"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4 text-amber-accent fill-amber-accent" />
          ) : (
            <Play className="h-4 w-4 text-amber-accent fill-amber-accent ml-0.5" />
          )}
        </button>

        {/* Progress bar */}
        <div
          className="flex-1 h-1.5 bg-muted rounded-full cursor-pointer relative"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-amber-accent/60 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-amber-accent shadow-sm transition-all duration-100"
            style={{ left: `${progress}%`, transform: `translate(-50%, -50%)` }}
          />
        </div>

        <span className="text-[11px] font-mono text-muted-foreground/50 tabular-nums shrink-0">
          {formatTime(isPlaying ? currentTime : duration)}
        </span>
      </div>

      {/* Transcript */}
      {transcript && (
        <div className="space-y-2">
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-foreground/90">
            {transcript}
          </p>

          {/* Transcript actions */}
          <div className="flex items-center gap-1 pt-1">
            <CopyButton text={transcript} />
            <ShareButton text={transcript} />
            <DownloadButton text={transcript} duration={duration} />
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Copy button ─────────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50 transition-colors"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {copied ? "복사됨" : "복사"}
    </button>
  )
}

/* ── Share button ─────────────────────────────────────── */
function ShareButton({ text }: { text: string }) {
  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ text })
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(text)
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50 transition-colors"
    >
      <Share2 className="h-3 w-3" />
      공유
    </button>
  )
}

/* ── Download as TXT ─────────────────────────────────── */
function DownloadButton({ text, duration }: { text: string; duration: number }) {
  function handleDownload() {
    const header = `[DotLine 음성 메모 전사]\n녹음 길이: ${Math.floor(duration / 60)}분 ${Math.floor(duration % 60)}초\n${"─".repeat(30)}\n\n`
    const blob = new Blob([header + text], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `dotline-voice-${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50 transition-colors"
    >
      <Download className="h-3 w-3" />
      다운로드
    </button>
  )
}
