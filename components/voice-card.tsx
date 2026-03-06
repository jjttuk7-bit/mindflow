"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, Copy, Check, Share2, Download, Gauge, Pencil, X, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface VoiceCardProps {
  fileUrl: string
  duration: number
  transcript?: string
  itemId?: string
  onTranscriptUpdate?: (transcript: string) => void
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2]

export function VoiceCard({ fileUrl, duration, transcript, itemId, onTranscriptUpdate }: VoiceCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [editingTranscript, setEditingTranscript] = useState(false)
  const [editText, setEditText] = useState(transcript || "")
  const [retranscribing, setRetranscribing] = useState(false)
  const [waveformData, setWaveformData] = useState<number[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Generate waveform visualization from audio
  useEffect(() => {
    if (!fileUrl || waveformData.length > 0) return
    const audioCtx = new AudioContext()
    fetch(fileUrl)
      .then(r => r.arrayBuffer())
      .then(buf => audioCtx.decodeAudioData(buf))
      .then(decoded => {
        const raw = decoded.getChannelData(0)
        const bars = 40
        const blockSize = Math.floor(raw.length / bars)
        const samples: number[] = []
        for (let i = 0; i < bars; i++) {
          let sum = 0
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(raw[i * blockSize + j])
          }
          samples.push(sum / blockSize)
        }
        const max = Math.max(...samples, 0.01)
        setWaveformData(samples.map(s => s / max))
      })
      .catch(() => {})
      .finally(() => audioCtx.close().catch(() => {}))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl])

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || waveformData.length === 0) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, w, h)
    const barW = w / waveformData.length
    const progressPct = progress / 100

    waveformData.forEach((val, i) => {
      const barH = Math.max(2, val * h * 0.9)
      const x = i * barW
      const y = (h - barH) / 2
      const isPast = i / waveformData.length < progressPct
      ctx.fillStyle = isPast ? "rgba(245, 158, 11, 0.7)" : "rgba(150, 150, 150, 0.25)"
      ctx.beginPath()
      ctx.roundRect(x + 1, y, barW - 2, barH, 1)
      ctx.fill()
    })
  }, [waveformData, progress])

  function getOrCreateAudio() {
    if (!audioRef.current) {
      const audio = new Audio(fileUrl)
      audioRef.current = audio
      audio.playbackRate = speed
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
    return audioRef.current
  }

  function togglePlay() {
    if (isPlaying) {
      audioRef.current?.pause()
      setIsPlaying(false)
    } else {
      const audio = getOrCreateAudio()
      audio.play()
      setIsPlaying(true)
    }
  }

  function cycleSpeed() {
    const idx = SPEED_OPTIONS.indexOf(speed)
    const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length]
    setSpeed(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = getOrCreateAudio()
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    audio.currentTime = pct * audio.duration
  }

  async function handleTranscriptSave() {
    if (!itemId || !editText.trim()) return
    try {
      const res = await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: editText.trim(),
          metadata: { file_url: fileUrl, duration, transcript: editText.trim() },
        }),
      })
      if (res.ok) {
        onTranscriptUpdate?.(editText.trim())
        setEditingTranscript(false)
        toast.success("전사본 수정됨")
      }
    } catch {
      toast.error("수정 실패")
    }
  }

  async function handleRetranscribe() {
    if (!itemId || retranscribing) return
    setRetranscribing(true)
    try {
      // Fetch audio and re-transcribe
      const audioRes = await fetch(fileUrl)
      const blob = await audioRes.blob()
      const formData = new FormData()
      formData.append("audio", blob, "recording.webm")
      const transRes = await fetch("/api/ai/transcribe", { method: "POST", body: formData })
      if (!transRes.ok) throw new Error()
      const { transcript: newTranscript } = await transRes.json()

      // Update item
      const patchRes = await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newTranscript,
          metadata: { file_url: fileUrl, duration, transcript: newTranscript },
        }),
      })
      if (patchRes.ok) {
        onTranscriptUpdate?.(newTranscript)
        setEditText(newTranscript)
        toast.success("재전사 완료!")
      }
    } catch {
      toast.error("재전사 실패")
    } finally {
      setRetranscribing(false)
    }
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

        {/* Waveform / Progress bar */}
        <div
          className="flex-1 h-8 cursor-pointer relative"
          onClick={handleSeek}
        >
          {waveformData.length > 0 ? (
            <canvas
              ref={canvasRef}
              className="w-full h-full"
            />
          ) : (
            <div className="absolute top-1/2 -translate-y-1/2 w-full">
              <div className="h-1.5 bg-muted rounded-full">
                <div
                  className="h-full bg-amber-accent/60 rounded-full transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Speed control */}
        <button
          onClick={cycleSpeed}
          title="재생 속도"
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 transition-colors tabular-nums"
        >
          <Gauge className="h-3 w-3" />
          {speed}x
        </button>

        <span className="text-[11px] font-mono text-muted-foreground/50 tabular-nums shrink-0">
          {formatTime(isPlaying ? currentTime : duration)}
        </span>
      </div>

      {/* Transcript */}
      {(transcript || editingTranscript) && (
        <div className="space-y-2">
          {editingTranscript ? (
            <div className="space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full text-[14px] leading-relaxed bg-muted/30 border border-border/60 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none min-h-[80px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleTranscriptSave()
                  if (e.key === "Escape") { setEditingTranscript(false); setEditText(transcript || "") }
                }}
              />
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleTranscriptSave}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                >
                  <Check className="h-3 w-3" />
                  저장
                </button>
                <button
                  onClick={() => { setEditingTranscript(false); setEditText(transcript || "") }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-muted-foreground text-xs hover:bg-muted transition-colors"
                >
                  <X className="h-3 w-3" />
                  취소
                </button>
                <span className="text-[10px] text-muted-foreground/40 ml-auto">Ctrl+Enter로 저장</span>
              </div>
            </div>
          ) : (
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-foreground/90">
              {transcript}
            </p>
          )}

          {/* Transcript actions */}
          {!editingTranscript && (
            <div className="flex items-center gap-1 pt-1">
              <CopyButton text={transcript || ""} />
              <ShareButton text={transcript || ""} />
              <DownloadButton text={transcript || ""} duration={duration} />
              {itemId && (
                <>
                  <button
                    onClick={() => { setEditText(transcript || ""); setEditingTranscript(true) }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50 transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                    수정
                  </button>
                  <button
                    onClick={handleRetranscribe}
                    disabled={retranscribing}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50 transition-colors"
                  >
                    <RefreshCw className={`h-3 w-3 ${retranscribing ? "animate-spin" : ""}`} />
                    {retranscribing ? "전사 중..." : "재전사"}
                  </button>
                </>
              )}
            </div>
          )}
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
