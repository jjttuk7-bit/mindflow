"use client"

import { useState, useEffect } from "react"
import { UserSettings } from "@/lib/supabase/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  MessageSquare, Loader2, Link as LinkIcon, Unlink, Copy, Check, ExternalLink, Bell,
} from "lucide-react"
import { toast } from "sonner"
import { urlBase64ToUint8Array } from "@/lib/utils"

interface Props {
  settings: UserSettings | null
  onSettingsChange: (s: UserSettings) => void
}

export function IntegrationsNotificationsSection({ settings, onSettingsChange }: Props) {
  const [linkLoading, setLinkLoading] = useState(false)
  const [unlinkLoading, setUnlinkLoading] = useState(false)
  const [telegramLink, setTelegramLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [pushSupported, setPushSupported] = useState(false)

  const isTelegramLinked = !!settings?.telegram_chat_id

  useEffect(() => {
    async function checkPush() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
      setPushSupported(true)
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setPushEnabled(!!sub)
    }
    checkPush()
  }, [])

  async function togglePush() {
    setPushLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      if (pushEnabled) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await fetch("/api/push/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          })
          await sub.unsubscribe()
        }
        setPushEnabled(false)
        toast.success("모닝 브리핑 알림이 해제되었습니다")
      } else {
        const permission = await Notification.requestPermission()
        if (permission !== "granted") {
          toast.error("알림 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.")
          return
        }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
        })
        const json = sub.toJSON()
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint, keys: json.keys }),
        })
        setPushEnabled(true)
        toast.success("매일 아침 모닝 브리핑을 받게 됩니다!")
      }
    } catch (err) {
      console.error("Push toggle error:", err)
      toast.error("알림 설정에 실패했습니다")
    } finally {
      setPushLoading(false)
    }
  }

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
        body: JSON.stringify({ telegram_chat_id: null, telegram_linked_at: null }),
      })
      if (res.ok) {
        const data = await res.json()
        onSettingsChange(data)
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

  return (
    <>
      {/* Telegram Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Telegram
          </CardTitle>
          <CardDescription>Telegram에서 바로 생각, 링크, 음성 메모를 캡처하세요</CardDescription>
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
                    <p className="text-sm font-medium text-foreground">연결됨</p>
                    <p className="text-xs text-muted-foreground">
                      연결일: {settings?.telegram_linked_at ? new Date(settings.telegram_linked_at).toLocaleDateString() : "최근"}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleUnlinkTelegram} disabled={unlinkLoading}>
                  {unlinkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
                  연결 해제
                </Button>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Telegram 봇에 메시지를 보내 아이템을 캡처하세요. 지원: 텍스트, 링크, 사진, 음성 메시지</p>
                <p>명령어: /search, /recent, /todo</p>
              </div>
            </>
          ) : telegramLink ? (
            <div className="space-y-3">
              <p className="text-sm text-foreground">Telegram에서 아래 링크를 열어 계정을 연결하세요:</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                  <p className="text-sm text-foreground font-mono truncate">{telegramLink}</p>
                </div>
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
                <a href={telegramLink} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="icon"><ExternalLink className="h-4 w-4" /></Button>
                </a>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                <p className="text-xs text-muted-foreground space-y-1">
                  <span className="font-medium text-foreground block mb-1">연결 방법:</span>
                  1. 링크를 클릭하거나 Telegram에서 열기<br />
                  2. 봇 채팅에서 &quot;Start&quot; 누르기<br />
                  3. 계정이 자동으로 연결됩니다<br />
                  4. 이 페이지를 새로고침하여 연결 상태를 확인하세요
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Telegram 계정을 연결하면 봇에 메시지를 보내 아이템을 캡처할 수 있습니다. 텍스트, 사진, 음성 메시지를 바로 보내보세요.
              </p>
              <Button onClick={handleLinkTelegram} disabled={linkLoading}>
                {linkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                Telegram 연결
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Section */}
      {pushSupported && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" />
              알림 설정
            </CardTitle>
            <CardDescription>푸시 알림으로 모닝 브리핑을 받아보세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">모닝 브리핑 알림</p>
                <p className="text-xs text-muted-foreground">매일 오전 8시에 어제 활동 요약을 받습니다</p>
              </div>
              <Button variant={pushEnabled ? "default" : "outline"} size="sm" onClick={togglePush} disabled={pushLoading}>
                {pushLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : pushEnabled ? "ON" : "OFF"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
