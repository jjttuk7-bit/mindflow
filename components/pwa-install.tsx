"use client"

import { useState, useEffect } from "react"
import { Download, X } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Already installed as PWA
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || ("standalone" in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone)
    setIsStandalone(standalone)
    if (standalone) return

    // Check if dismissed recently
    const dismissed = localStorage.getItem("pwa-install-dismissed")
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return

    // iOS detection
    const ua = navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    setIsIOS(ios)

    // Android/Chrome: capture beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }
    window.addEventListener("beforeinstallprompt", handler)

    // iOS: show manual instructions after 3 seconds
    if (ios) {
      const timer = setTimeout(() => setShowBanner(true), 3000)
      return () => {
        clearTimeout(timer)
        window.removeEventListener("beforeinstallprompt", handler)
      }
    }

    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") {
      setShowBanner(false)
    }
    setDeferredPrompt(null)
  }

  function handleDismiss() {
    setShowBanner(false)
    localStorage.setItem("pwa-install-dismissed", Date.now().toString())
  }

  if (isStandalone || !showBanner) return null

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="rounded-xl border border-border/60 bg-card shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Mindflow 앱 설치</p>
            {isIOS ? (
              <p className="text-xs text-muted-foreground mt-0.5">
                Safari 하단의 <span className="inline-block align-middle">⬆️</span> 공유 버튼 → &quot;홈 화면에 추가&quot;를 눌러주세요
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                홈 화면에 추가하면 앱처럼 사용할 수 있어요
              </p>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {!isIOS && deferredPrompt && (
          <button
            onClick={handleInstall}
            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Download className="h-4 w-4" />
            설치하기
          </button>
        )}
      </div>
    </div>
  )
}
