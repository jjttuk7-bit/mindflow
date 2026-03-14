"use client"

import { useState, useEffect } from "react"
import { Bell, X } from "lucide-react"
import { toast } from "sonner"

export function PushPrompt() {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function check() {
      // Don't show if already dismissed this session
      if (localStorage.getItem("push_prompt_dismissed")) return

      // Don't show if push not supported
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return

      // Don't show if already subscribed
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) return
      } catch {
        return
      }

      // Check if notification permission was already denied
      if (Notification.permission === "denied") return

      setShow(true)
    }

    // Delay the check to not interfere with initial load
    const timer = setTimeout(check, 3000)
    return () => clearTimeout(timer)
  }, [])

  async function handleEnable() {
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setShow(false)
        localStorage.setItem("push_prompt_dismissed", "1")
        return
      }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })

      const json = sub.toJSON()
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: json.keys,
        }),
      })

      toast.success("알림이 설정되었습니다")
      setShow(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error("Push subscription failed:", err)
      toast.error(`알림 설정 실패: ${msg}`, { duration: 10000 })
      setShow(false)
    } finally {
      setLoading(false)
    }
  }

  function handleDismiss() {
    setShow(false)
    localStorage.setItem("push_prompt_dismissed", "1")
  }

  if (!show) return null

  return (
    <div className="mx-4 mb-3 flex items-center gap-3 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
        <Bell className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground">매일 아침 브리핑 받기</p>
        <p className="text-ui-xs text-muted-foreground/70">어제 활동 요약 + 할 일 알림을 푸시로 받아보세요</p>
      </div>
      <button
        onClick={handleEnable}
        disabled={loading}
        className="shrink-0 text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-lg disabled:opacity-50"
      >
        {loading ? "..." : "허용"}
      </button>
      <button
        onClick={handleDismiss}
        className="shrink-0 h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
