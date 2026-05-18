"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, Suspense } from "react"
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
  Database,
  Loader2,
  ExternalLink,
  CreditCard,
  Sparkles,
  X,
  CheckCircle2,
  Info,
  Check,
} from "lucide-react"
import Link from "next/link"

const PRO_FEATURES = [
  "AI project classification",
  "Unlimited AI chat",
  "Full insight reports",
  "Unlimited smart folders & projects",
  "Priority support",
]

function SettingsContent() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState<string | null>(null)
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [billingLoading, setBillingLoading] = useState(false)
  const [billingBanner, setBillingBanner] = useState<"success" | "cancel" | null>(null)

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
    const supabase = createClient()
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setEmail(user?.email ?? null)
      await fetchSettings()
      setLoading(false)
    }
    init()
  }, [fetchSettings])

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
              Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your account and subscription
            </p>
          </div>
        </div>

        {/* Billing Banner */}
        {billingBanner === "success" && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
            <p className="text-sm text-green-800 dark:text-green-200 flex-1">
              Welcome to Pro! Your subscription is now active.
            </p>
            <button onClick={() => setBillingBanner(null)} className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {billingBanner === "cancel" && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
            <Info className="h-5 w-5 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground flex-1">
              Checkout was cancelled. You can upgrade anytime.
            </p>
            <button onClick={() => setBillingBanner(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="space-y-6">
          {/* General */}
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
                  <p className="text-sm text-muted-foreground">Your current subscription plan</p>
                </div>
                <Badge variant={isPro ? "default" : "secondary"}>
                  {isPro ? "Pro" : "Free"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Billing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4" />
                Billing
              </CardTitle>
              <CardDescription>Manage your subscription and billing</CardDescription>
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
                        <p className="text-sm font-medium text-foreground">Pro Plan Active</p>
                        <p className="text-xs text-muted-foreground">You have access to all features</p>
                      </div>
                    </div>
                    <Badge variant="default">Pro</Badge>
                  </div>
                  <Button variant="outline" onClick={handleManageSubscription} disabled={billingLoading} className="w-full">
                    {billingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                    Manage Subscription
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Cancel or modify your subscription via Stripe
                  </p>
                </>
              ) : (
                <>
                  <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-sm font-medium text-foreground">Upgrade to Pro</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-semibold text-foreground">$9.99</span>
                        <span className="text-sm text-muted-foreground">/month</span>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {PRO_FEATURES.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button onClick={handleUpgrade} disabled={billingLoading} className="w-full">
                    {billingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Upgrade Now
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Data */}
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
                  <p className="text-sm font-medium text-foreground">Export Data</p>
                  <p className="text-sm text-muted-foreground">
                    Download your items in JSON or Markdown format
                  </p>
                </div>
                <Link href="/">
                  <Button variant="outline" size="sm">Go to Export</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  )
}
