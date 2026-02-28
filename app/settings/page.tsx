"use client"

import { useState, useEffect, useCallback } from "react"
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
} from "lucide-react"
import Link from "next/link"

export default function SettingsPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [linkLoading, setLinkLoading] = useState(false)
  const [unlinkLoading, setUnlinkLoading] = useState(false)
  const [telegramLink, setTelegramLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isTelegramLinked = !!settings?.telegram_chat_id

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
              Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your account and integrations
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* General Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                General
              </CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Email</p>
                  <p className="text-sm text-muted-foreground">{email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Plan</p>
                  <p className="text-sm text-muted-foreground">
                    Your current subscription plan
                  </p>
                </div>
                <Badge
                  variant={settings?.plan === "pro" ? "default" : "secondary"}
                >
                  {settings?.plan === "pro" ? "Pro" : "Free"}
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
                Capture thoughts, links, and voice notes directly from Telegram
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
                          Connected
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Linked{" "}
                          {settings?.telegram_linked_at
                            ? new Date(
                                settings.telegram_linked_at
                              ).toLocaleDateString()
                            : "recently"}
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
                      Unlink
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>
                      Send messages to your Telegram bot to capture items.
                      Supported: text, links, photos, and voice messages.
                    </p>
                    <p>
                      Commands: /search, /recent, /todo
                    </p>
                  </div>
                </>
              ) : telegramLink ? (
                <div className="space-y-3">
                  <p className="text-sm text-foreground">
                    Open this link in Telegram to connect your account:
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
                        Instructions:
                      </span>
                      1. Click the link or open it in Telegram
                      <br />
                      2. Press &quot;Start&quot; in the bot chat
                      <br />
                      3. Your account will be linked automatically
                      <br />
                      4. Refresh this page to see the connected status
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Link your Telegram account to capture items by messaging a
                    bot. Send text, photos, and voice messages directly from
                    Telegram.
                  </p>
                  <Button onClick={handleLinkTelegram} disabled={linkLoading}>
                    {linkLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LinkIcon className="h-4 w-4" />
                    )}
                    Link Telegram
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4" />
                Data
              </CardTitle>
              <CardDescription>Export and manage your data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Export Data
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Download your items in JSON or Markdown format
                  </p>
                </div>
                <Link href="/">
                  <Button variant="outline" size="sm">
                    Go to Export
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
