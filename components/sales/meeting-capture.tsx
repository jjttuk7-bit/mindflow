"use client"

import { useState, useRef } from "react"
import { toast } from "sonner"
import {
  X, Mic, Square, Loader2, Sparkles, Save,
  PhoneCall, Video, MapPin, Clock,
  ChevronDown, ChevronUp, User, Building2,
  Calendar, AlertTriangle,
} from "lucide-react"
import { VoiceRecorder } from "@/components/voice-recorder"

type AIExtraction = {
  summary: string
  customer_name: string | null
  company: string | null
  promises: string[]
  budget: string | null
  competitors: string[]
  next_steps: string[]
  sentiment: string
  key_topics: string[]
}

type MeetingType = "meeting" | "call" | "visit"

const MEETING_TYPES: { value: MeetingType; label: string; icon: typeof Video }[] = [
  { value: "meeting", label: "미팅", icon: Video },
  { value: "call", label: "통화", icon: PhoneCall },
  { value: "visit", label: "방문", icon: MapPin },
]

export function MeetingCapture({
  customerId,
  customerName,
  onClose,
  onSave,
}: {
  customerId?: string
  customerName?: string
  onClose: () => void
  onSave: () => void
}) {
  const [step, setStep] = useState<"record" | "edit" | "review">("record")
  const [meetingType, setMeetingType] = useState<MeetingType>("meeting")
  const [transcript, setTranscript] = useState("")
  const [transcribing, setTranscribing] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extraction, setExtraction] = useState<AIExtraction | null>(null)
  const [showExtraction, setShowExtraction] = useState(true)
  const [saving, setSaving] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [duration, setDuration] = useState(0)
  const fileUrlRef = useRef<string | null>(null)

  const handleRecorded = async (blob: Blob, dur: number) => {
    setAudioBlob(blob)
    setDuration(dur)
    setTranscribing(true)
    setStep("edit")

    try {
      // Upload audio
      const uploadForm = new FormData()
      uploadForm.append("file", blob, `meeting-${Date.now()}.webm`)
      uploadForm.append("bucket", "items-audio")
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: uploadForm,
      })
      if (uploadRes.ok) {
        const { url } = await uploadRes.json()
        fileUrlRef.current = url
      }

      // Transcribe
      const transcribeForm = new FormData()
      transcribeForm.append("audio", blob, "recording.webm")
      const res = await fetch("/api/ai/transcribe", {
        method: "POST",
        body: transcribeForm,
      })

      if (!res.ok) throw new Error()
      const { transcript: text } = await res.json()
      setTranscript(text)
    } catch {
      toast.error("음성 인식에 실패했습니다")
    } finally {
      setTranscribing(false)
    }
  }

  const handleAIExtract = async () => {
    if (!transcript.trim()) {
      toast.error("내용이 없습니다")
      return
    }

    setExtracting(true)
    try {
      const res = await fetch("/api/sales/ai-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: transcript,
          type: meetingType,
        }),
      })

      if (!res.ok) throw new Error()
      const data = await res.json()
      setExtraction(data)
      setStep("review")
    } catch {
      toast.error("AI 분석에 실패했습니다")
    } finally {
      setExtracting(false)
    }
  }

  const handleSave = async () => {
    if (!transcript.trim()) return

    setSaving(true)
    try {
      // Save as activity
      const res = await fetch("/api/sales/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId || undefined,
          type: meetingType === "meeting" ? "meeting" : meetingType === "call" ? "call" : "visit",
          content: transcript,
          summary: extraction?.summary || undefined,
          duration_min: Math.ceil(duration / 60),
          occurred_at: new Date().toISOString(),
          metadata: {
            file_url: fileUrlRef.current,
            ai_extraction: extraction,
            from_voice: true,
          },
        }),
      })

      if (!res.ok) throw new Error()

      // Auto-create follow-ups from promises
      if (extraction?.promises?.length && customerId) {
        for (const promise of extraction.promises) {
          const dueDate = new Date()
          dueDate.setDate(dueDate.getDate() + 3) // default 3 days
          await fetch("/api/sales/follow-ups", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customer_id: customerId,
              title: promise,
              description: `${MEETING_TYPES.find(t => t.value === meetingType)?.label}에서 나온 약속`,
              due_date: dueDate.toISOString(),
              priority: "medium",
            }),
          })
        }
      }

      toast.success("미팅 기록이 저장되었습니다")
      if (extraction?.promises?.length) {
        toast.success(`${extraction.promises.length}개 할 일이 자동 생성되었습니다`)
      }
      onSave()
    } catch {
      toast.error("저장에 실패했습니다")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-2xl sm:rounded-2xl border border-border/60 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              미팅 캡처
            </h2>
            {customerName && (
              <p className="text-xs text-muted-foreground mt-0.5">{customerName}</p>
            )}
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Meeting type */}
          <div className="flex gap-2">
            {MEETING_TYPES.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.value}
                  onClick={() => setMeetingType(t.value)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm transition-all ${
                    meetingType === t.value
                      ? "border-primary bg-primary/5 text-primary font-medium"
                      : "border-border/60 text-muted-foreground hover:border-border"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* Step 1: Record */}
          {step === "record" && (
            <div className="py-4">
              <VoiceRecorder onRecorded={handleRecorded} />
              <p className="text-xs text-center text-muted-foreground mt-4">
                녹음 후 자동으로 텍스트로 변환됩니다
              </p>
            </div>
          )}

          {/* Step 2: Edit transcript */}
          {step === "edit" && (
            <div className="space-y-3">
              {transcribing ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">음성을 텍스트로 변환 중...</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      전사 내용 (수정 가능)
                    </label>
                    <textarea
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      rows={8}
                      className="w-full px-4 py-3 rounded-lg border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none leading-relaxed"
                      placeholder="녹음된 내용이 여기에 표시됩니다..."
                    />
                  </div>
                  {duration > 0 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      녹음 시간: {Math.floor(duration / 60)}분 {Math.floor(duration % 60)}초
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 3: Review AI extraction */}
          {step === "review" && extraction && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
                <p className="text-sm font-medium flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI 요약
                </p>
                <p className="text-sm leading-relaxed">{extraction.summary}</p>
              </div>

              {/* Extracted info */}
              <button
                onClick={() => setShowExtraction(!showExtraction)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {showExtraction ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                추출된 정보
              </button>

              {showExtraction && (
                <div className="space-y-2">
                  {extraction.customer_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">고객:</span>
                      <span className="font-medium">{extraction.customer_name}</span>
                      {extraction.company && (
                        <span className="text-muted-foreground">({extraction.company})</span>
                      )}
                    </div>
                  )}

                  {extraction.budget && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">예산:</span>
                      <span className="font-medium">{extraction.budget}</span>
                    </div>
                  )}

                  {extraction.competitors.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-muted-foreground">경쟁사:</span>
                      <span>{extraction.competitors.join(", ")}</span>
                    </div>
                  )}

                  {extraction.promises.length > 0 && (
                    <div className="text-sm">
                      <p className="text-muted-foreground mb-1 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        약속/할 일 (자동 생성됨):
                      </p>
                      <ul className="space-y-1 ml-5">
                        {extraction.promises.map((p, i) => (
                          <li key={i} className="text-sm list-disc">{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {extraction.next_steps.length > 0 && (
                    <div className="text-sm">
                      <p className="text-muted-foreground mb-1">다음 단계:</p>
                      <ul className="space-y-1 ml-5">
                        {extraction.next_steps.map((s, i) => (
                          <li key={i} className="text-sm list-disc">{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {extraction.key_topics.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      {extraction.key_topics.map((t, i) => (
                        <span key={i} className="text-ui-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Editable transcript */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">전사 내용</label>
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 rounded-lg border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none leading-relaxed"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/60 bg-muted/30 flex-shrink-0">
          {step === "edit" && !transcribing && (
            <>
              <button
                onClick={() => setStep("record")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                다시 녹음
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={!transcript.trim() || saving}
                  className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                >
                  바로 저장
                </button>
                <button
                  onClick={handleAIExtract}
                  disabled={!transcript.trim() || extracting}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {extracting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {extracting ? "분석 중..." : "AI 분석"}
                </button>
              </div>
            </>
          )}

          {step === "review" && (
            <>
              <button
                onClick={() => setStep("edit")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                수정하기
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "저장 중..." : "저장"}
              </button>
            </>
          )}

          {step === "record" && (
            <div className="w-full text-center">
              <p className="text-xs text-muted-foreground">위 버튼으로 녹음을 시작하세요</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
