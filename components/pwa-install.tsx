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

  useEffect(() => {
    // Already installed as PWA — hide
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || ("standalone" in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone)
    if (standalone) return

    // Check if dismissed recently (7 days)
    const dismissed = localStorage.getItem("pwa-install-dismissed")
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return

    // Detect mobile
    const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    if (!isMobile) return

    // iOS detection
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    setIsIOS(ios)

    // Capture beforeinstallprompt (Android Chrome)
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }
    window.addEventListener("beforeinstallprompt", handler)

    // Show banner after 2 seconds on all mobile devices
    const timer = setTimeout(() => setShowBanner(true), 2000)

    return () => {
      clearTimeout(timer)
      window.removeEventListener("beforeinstallprompt", handler)
    }
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") {
      setShowBanner(false)
      localStorage.setItem("pwa-install-dismissed", Date.now().toString())
    }
    setDeferredPrompt(null)
  }

  function handleDismiss() {
    setShowBanner(false)
    localStorage.setItem("pwa-install-dismissed", Date.now().toString())
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="rounded-xl border border-border/60 bg-card shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">DotLine 앱 설치</p>
            {isIOS ? (
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                하단 공유 버튼 <span className="text-base leading-none align-middle">⬆</span> → &quot;홈 화면에 추가&quot;를 눌러주세요
              </p>
            ) : deferredPrompt ? (
              <div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  홈 화면에 추가하면 앱처럼 사용할 수 있어요
                </p>
                <p className="text-[11px] text-primary/70 mt-1">
                  설치하면 카톡 등에서 바로 DotLine으로 공유 가능!
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  브라우저 메뉴 <span className="font-bold">⋮</span> → &quot;홈 화면에 추가&quot; 또는 &quot;앱 설치&quot;를 눌러주세요
                </p>
                <p className="text-[11px] text-primary/70 mt-1">
                  설치하면 카톡 등에서 바로 DotLine으로 공유 가능!
                </p>
              </div>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {deferredPrompt && (
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
