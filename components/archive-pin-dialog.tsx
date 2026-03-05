"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useStore } from "@/lib/store"
import { X, Lock } from "lucide-react"
import Link from "next/link"

export function ArchivePinDialog() {
  const { showPinDialog, setShowPinDialog, setShowArchived } = useStore()
  const [digits, setDigits] = useState(["", "", "", ""])
  const [error, setError] = useState("")
  const [shake, setShake] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (showPinDialog) {
      setDigits(["", "", "", ""])
      setError("")
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
    }
  }, [showPinDialog])

  const verify = useCallback(async (pin: string) => {
    setLoading(true)
    try {
      const res = await fetch("/api/settings/archive-pin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      })
      const data = await res.json()
      if (data.valid) {
        sessionStorage.setItem("archive_unlocked", "true")
        setShowPinDialog(false)
        setShowArchived(true)
      } else {
        setError("PIN이 일치하지 않습니다")
        setShake(true)
        setTimeout(() => setShake(false), 500)
        setDigits(["", "", "", ""])
        setTimeout(() => inputRefs.current[0]?.focus(), 50)
      }
    } catch {
      setError("오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }, [setShowPinDialog, setShowArchived])

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const next = [...digits]
    next[index] = value.slice(-1)
    setDigits(next)
    setError("")

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }

    if (value && index === 3) {
      const pin = next.join("")
      if (pin.length === 4) verify(pin)
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4)
    if (text.length === 4) {
      const next = text.split("")
      setDigits(next)
      verify(text)
    }
  }

  if (!showPinDialog) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={`relative w-full max-w-xs mx-4 rounded-2xl border border-border/60 bg-background p-6 shadow-xl transition-transform ${
          shake ? "animate-shake" : ""
        }`}
      >
        <button
          onClick={() => setShowPinDialog(false)}
          className="absolute right-3 top-3 h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-display text-lg font-semibold text-foreground mb-1">
            보관함 잠금
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            PIN 4자리를 입력하세요
          </p>

          <div className="flex gap-3 mb-4" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={loading}
                className="h-14 w-12 rounded-xl border-2 border-border/60 bg-muted/30 text-center text-2xl font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
              />
            ))}
          </div>

          {error && (
            <p className="text-sm text-destructive mb-3">{error}</p>
          )}

          <Link
            href="/settings"
            onClick={() => setShowPinDialog(false)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            PIN을 잊으셨나요?
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  )
}
