"use client"

import { Suspense, useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { UserSettings } from "@/lib/supabase/types"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  User,
  MessageSquare,
  Database,
  Loader2,
  Link as LinkIcon,
  Unlink,
  Copy,
  Check,
  ExternalLink,
  CreditCard,
  Sparkles,
  X,
  CheckCircle2,
  Info,
} from "lucide-react"
import Link from "next/link"

const PRO_FEATURES = [
  "무제한 Telegram 캡처",
  "AI 프로젝트 자동 분류",
  "무제한 AI 채팅",
  "전체 인사이트 리포트",
  "우선 지원",
]

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
  const [linkLoading, setLinkLoading] = useState(false)
  const [unlinkLoading, setUnlinkLoading] = useState(false)
  const [telegramLink, setTelegramLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [billingLoading, setBillingLoading] = useState(false)
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
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setEmail(user?.email ?? null)
      await fetchSettings()
      setLoading(false)
    }
    init()
  }, [supabase.auth, fetchSettings])

  // Handle billing URL params
  useEffect(() => {
    const billing = searchParams.get("billing")
    if (billing === "success") {
      setBillingBanner("success")
      // Refresh settings to get updated plan
      fetchSettings()
      // Clean URL without reload
      window.history.replaceState({}, "", "/settings")
    } else if (billing === "cancel") {
      setBillingBanner("cancel")
      window.history.replaceState({}, "", "/settings")
    }
  }, [searchParams, fetchSettings])

  async function handleLinkTelegram() {
    setLinkLoading(true)
    try {
      const res = await fetch("/api/telegram/link", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        setTelegramLink(data.link)
      }
    } catch (err) {
      console.error("Failed to generate link:", err)
    }
    setLinkLoading(false)
  }

  async function handleUnlinkTelegram() {
    setUnlinkLoading(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram_chat_id: null,
          telegram_linked_at: null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
        setTelegramLink(null)
      }
    } catch (err) {
      console.error("Failed to unlink:", err)
    }
    setUnlinkLoading(false)
  }

  async function handleCopyLink() {
    if (!telegramLink) return
    await navigator.clipboard.writeText(telegramLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleUpgrade() {
    setBillingLoading(true)
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
          return
        }
      }
    } catch (err) {
      console.error("Failed to create checkout session:", err)
    }
    setBillingLoading(false)
  }

  async function handleManageSubscription() {
    setBillingLoading(true)
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
          return
        }
      }
    } catch (err) {
      console.error("Failed to open billing portal:", err)
    }
    setBillingLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isTelegramLinked = !!settings?.telegram_chat_id
  const isPro = settings?.plan === "pro"

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-2xl tracking-tight text-foreground">
              설정
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              계정, 연동, 구독을 관리하세요
            </p>
          </div>
        </div>

        {/* Billing Banner */}
        {billingBanner === "success" && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
            <p className="text-sm text-green-800 dark:text-green-200 flex-1">
              Pro 플랜에 오신 것을 환영합니다! 구독이 활성화되었습니다.
            </p>
            <button
              onClick={() => setBillingBanner(null)}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {billingBanner === "cancel" && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
            <Info className="h-5 w-5 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground flex-1">
              결제가 취소되었습니다. 언제든 업그레이드할 수 있습니다.
            </p>
            <button
              onClick={() => setBillingBanner(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="space-y-6">
          {/* General Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                일반
              </CardTitle>
              <CardDescription>계정 정보</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">이메일</p>
                  <p className="text-sm text-muted-foreground">{email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">플랜</p>
                  <p className="text-sm text-muted-foreground">
                    현재 구독 플랜
                  </p>
                </div>
                <Badge
                  variant={isPro ? "default" : "secondary"}
                >
                  {isPro ? "Pro" : "Free"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Telegram Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4" />
                Telegram
              </CardTitle>
              <CardDescription>
                Telegram에서 바로 생각, 링크, 음성 메모를 캡처하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isTelegramLinked ? (
                <>
                  <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                        <Check className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          연결됨
                        </p>
                        <p className="text-xs text-muted-foreground">
                          연결일:{" "}
                          {settings?.telegram_linked_at
                            ? new Date(
                                settings.telegram_linked_at
                              ).toLocaleDateString()
                            : "최근"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUnlinkTelegram}
                      disabled={unlinkLoading}
                    >
                      {unlinkLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Unlink className="h-3 w-3" />
                      )}
                      연결 해제
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>
                      Telegram 봇에 메시지를 보내 아이템을 캡처하세요.
                      지원: 텍스트, 링크, 사진, 음성 메시지
                    </p>
                    <p>
                      명령어: /search, /recent, /todo
                    </p>
                  </div>
                </>
              ) : telegramLink ? (
                <div className="space-y-3">
                  <p className="text-sm text-foreground">
                    Telegram에서 아래 링크를 열어 계정을 연결하세요:
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                      <p className="text-sm text-foreground font-mono truncate">
                        {telegramLink}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyLink}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <a
                      href={telegramLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="icon">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                    <p className="text-xs text-muted-foreground space-y-1">
                      <span className="font-medium text-foreground block mb-1">
                        연결 방법:
                      </span>
                      1. 링크를 클릭하거나 Telegram에서 열기
                      <br />
                      2. 봇 채팅에서 &quot;Start&quot; 누르기
                      <br />
                      3. 계정이 자동으로 연결됩니다
                      <br />
                      4. 이 페이지를 새로고침하여 연결 상태를 확인하세요
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Telegram 계정을 연결하면 봇에 메시지를 보내 아이템을 캡처할 수 있습니다.
                    텍스트, 사진, 음성 메시지를 바로 보내보세요.
                  </p>
                  <Button onClick={handleLinkTelegram} disabled={linkLoading}>
                    {linkLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LinkIcon className="h-4 w-4" />
                    )}
                    Telegram 연결
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Billing Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4" />
                구독
              </CardTitle>
              <CardDescription>
                구독 및 결제를 관리하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isPro ? (
                <>
                  <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Pro 플랜 활성
                        </p>
                        <p className="text-xs text-muted-foreground">
                          모든 기능을 이용할 수 있습니다
                        </p>
                      </div>
                    </div>
                    <Badge variant="default">Pro</Badge>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleManageSubscription}
                    disabled={billingLoading}
                    className="w-full"
                  >
                    {billingLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                    구독 관리
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Stripe를 통해 구독을 취소하거나 변경할 수 있습니다
                  </p>
                </>
              ) : (
                <>
                  <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-sm font-medium text-foreground">
                          Pro로 업그레이드
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-semibold text-foreground">
                          $9.99
                        </span>
                        <span className="text-sm text-muted-foreground">
                          /month
                        </span>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {PRO_FEATURES.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button
                    onClick={handleUpgrade}
                    disabled={billingLoading}
                    className="w-full"
                  >
                    {billingLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    지금 업그레이드
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Data Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4" />
                데이터
              </CardTitle>
              <CardDescription>데이터를 내보내고 관리하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    데이터 내보내기
                  </p>
                  <p className="text-sm text-muted-foreground">
                    JSON 또는 Markdown 형식으로 아이템을 다운로드하세요
                  </p>
                </div>
                <Link href="/">
                  <Button variant="outline" size="sm">
                    피드에서 내보내기
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
