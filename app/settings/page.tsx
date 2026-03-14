"use client"

import { Suspense, useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { UserSettings } from "@/lib/supabase/types"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2, X, CheckCircle2, Info } from "lucide-react"
import Link from "next/link"
import { ProfileAppearanceSection } from "@/components/settings/profile-appearance-section"
import { IntegrationsNotificationsSection } from "@/components/settings/integrations-notifications-section"
import { SecurityBillingSection } from "@/components/settings/security-billing-section"

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  )
}

function SettingsContent() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState<string | null>(null)
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [billingBanner, setBillingBanner] = useState<"success" | "cancel" | null>(null)

  const supabase = createClient()

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings")
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err)
    }
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setEmail(user?.email ?? null)
      await fetchSettings()
      setLoading(false)
    }
    init()
  }, [supabase.auth, fetchSettings])

  useEffect(() => {
    const billing = searchParams.get("billing")
    if (billing === "success") {
      setBillingBanner("success")
      fetchSettings()
      window.history.replaceState({}, "", "/settings")
    } else if (billing === "cancel") {
      setBillingBanner("cancel")
      window.history.replaceState({}, "", "/settings")
    }
  }, [searchParams, fetchSettings])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon" aria-label="뒤로가기">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-2xl tracking-tight text-foreground">설정</h1>
            <p className="text-sm text-muted-foreground mt-0.5">계정, 연동, 구독을 관리하세요</p>
          </div>
        </div>

        {/* Billing Banner */}
        {billingBanner === "success" && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
            <p className="text-sm text-green-800 dark:text-green-200 flex-1">
              Pro 플랜에 오신 것을 환영합니다! 구독이 활성화되었습니다.
            </p>
            <button onClick={() => setBillingBanner(null)} className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {billingBanner === "cancel" && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
            <Info className="h-5 w-5 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground flex-1">결제가 취소되었습니다. 언제든 업그레이드할 수 있습니다.</p>
            <button onClick={() => setBillingBanner(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="space-y-6">
          <ProfileAppearanceSection email={email} settings={settings} />
          <IntegrationsNotificationsSection settings={settings} onSettingsChange={setSettings} />
          <SecurityBillingSection email={email} settings={settings} />
        </div>
      </div>
    </div>
  )
}
