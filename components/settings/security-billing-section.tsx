"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { UserSettings } from "@/lib/supabase/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Loader2, Check, ExternalLink, CreditCard, Sparkles, Lock, Database,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

const PRO_FEATURES = [
  "무제한 Telegram 캡처",
  "AI 프로젝트 자동 분류",
  "무제한 AI 채팅",
  "전체 인사이트 리포트",
  "우선 지원",
]

interface Props {
  email: string | null
  settings: UserSettings | null
}

export function SecurityBillingSection({ email, settings }: Props) {
  const [billingLoading, setBillingLoading] = useState(false)
  const [pinSet, setPinSet] = useState(!!settings?.preferences?.archive_pin)
  const [pinMode, setPinMode] = useState<null | "set" | "change">(null)
  const [pinDigits, setPinDigits] = useState(["", "", "", ""])
  const [pinConfirmDigits, setPinConfirmDigits] = useState(["", "", "", ""])
  const [pinStep, setPinStep] = useState<"enter" | "confirm">("enter")
  const [pinError, setPinError] = useState("")
  const [pinLoading, setPinLoading] = useState(false)
  const [pinAuth, setPinAuth] = useState(false)
  const [pinAuthAction, setPinAuthAction] = useState<"change" | "remove" | null>(null)
  const [pinPassword, setPinPassword] = useState("")
  const [pinAuthError, setPinAuthError] = useState("")
  const [pinAuthLoading, setPinAuthLoading] = useState(false)

  const supabase = createClient()
  const isPro = settings?.plan === "pro"

  async function handlePinAuth() {
    if (!pinPassword || !email) return
    setPinAuthLoading(true)
    setPinAuthError("")
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pinPassword })
      if (error) { setPinAuthError("비밀번호가 일치하지 않습니다"); return }
      setPinAuth(false)
      setPinPassword("")
      if (pinAuthAction === "change") setPinMode("change")
      else if (pinAuthAction === "remove") handlePinRemove()
      setPinAuthAction(null)
    } catch {
      setPinAuthError("인증에 실패했습니다")
    } finally {
      setPinAuthLoading(false)
    }
  }

  function resetPinForm() {
    setPinMode(null)
    setPinStep("enter")
    setPinDigits(["", "", "", ""])
    setPinConfirmDigits(["", "", "", ""])
    setPinError("")
  }

  function handlePinDigitChange(
    digits: string[], setFn: (d: string[]) => void,
    index: number, value: string, refs: (HTMLInputElement | null)[]
  ) {
    if (!/^\d*$/.test(value)) return
    const next = [...digits]
    next[index] = value.slice(-1)
    setFn(next)
    setPinError("")
    if (value && index < 3) refs[index + 1]?.focus()
  }

  function handlePinKeyDown(digits: string[], index: number, e: React.KeyboardEvent, refs: (HTMLInputElement | null)[]) {
    if (e.key === "Backspace" && !digits[index] && index > 0) refs[index - 1]?.focus()
  }

  async function handlePinSubmit() {
    const pin = pinDigits.join("")
    if (pin.length !== 4) return
    if (pinStep === "enter") { setPinStep("confirm"); setPinConfirmDigits(["", "", "", ""]); return }
    const confirmPin = pinConfirmDigits.join("")
    if (confirmPin.length !== 4) return
    if (pin !== confirmPin) { setPinError("PIN이 일치하지 않습니다"); setPinConfirmDigits(["", "", "", ""]); return }
    setPinLoading(true)
    try {
      const res = await fetch("/api/settings/archive-pin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) })
      if (res.ok) { setPinSet(true); resetPinForm(); sessionStorage.removeItem("archive_unlocked"); toast.success("보관함 PIN이 설정되었습니다") }
    } catch { setPinError("오류가 발생했습니다") }
    finally { setPinLoading(false) }
  }

  async function handlePinRemove() {
    setPinLoading(true)
    try {
      const res = await fetch("/api/settings/archive-pin", { method: "DELETE" })
      if (res.ok) { setPinSet(false); sessionStorage.removeItem("archive_unlocked"); toast.success("보관함 PIN이 해제되었습니다") }
    } catch { toast.error("오류가 발생했습니다") }
    finally { setPinLoading(false) }
  }

  async function handleUpgrade() {
    setBillingLoading(true)
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" })
      if (res.ok) { const data = await res.json(); if (data.url) { window.location.href = data.url; return } }
    } catch (err) { console.error("Failed to create checkout session:", err) }
    setBillingLoading(false)
  }

  async function handleManageSubscription() {
    setBillingLoading(true)
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" })
      if (res.ok) { const data = await res.json(); if (data.url) { window.location.href = data.url; return } }
    } catch (err) { console.error("Failed to open billing portal:", err) }
    setBillingLoading(false)
  }

  return (
    <>
      {/* Billing Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><CreditCard className="h-4 w-4" />구독</CardTitle>
          <CardDescription>구독 및 결제를 관리하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPro ? (
            <>
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Pro 플랜 활성</p>
                    <p className="text-xs text-muted-foreground">모든 기능을 이용할 수 있습니다</p>
                  </div>
                </div>
                <Badge variant="default">Pro</Badge>
              </div>
              <Button variant="outline" onClick={handleManageSubscription} disabled={billingLoading} className="w-full">
                {billingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                구독 관리
              </Button>
              <p className="text-xs text-muted-foreground text-center">Stripe를 통해 구독을 취소하거나 변경할 수 있습니다</p>
            </>
          ) : (
            <>
              <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium text-foreground">Pro로 업그레이드</span>
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
                지금 업그레이드
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Archive PIN Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Lock className="h-4 w-4" />보관함 잠금</CardTitle>
          <CardDescription>보관함에 PIN 잠금을 설정하여 민감한 항목을 보호하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pinMode ? (
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">{pinStep === "enter" ? "새 PIN 입력" : "PIN 확인"}</p>
              <div className="flex gap-3 justify-center">
                {(pinStep === "enter" ? pinDigits : pinConfirmDigits).map((d, i) => (
                  <input
                    key={`${pinStep}-${i}`}
                    ref={(el) => { if (el) { el.dataset.pinIndex = String(i); el.dataset.pinStep = pinStep } }}
                    autoFocus={i === 0}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => {
                      const parent = e.target.parentElement
                      const refs = parent ? Array.from(parent.querySelectorAll("input")) as HTMLInputElement[] : []
                      handlePinDigitChange(pinStep === "enter" ? pinDigits : pinConfirmDigits, pinStep === "enter" ? setPinDigits : setPinConfirmDigits, i, e.target.value, refs)
                    }}
                    onKeyDown={(e) => {
                      const parent = (e.target as HTMLElement).parentElement
                      const refs = parent ? Array.from(parent.querySelectorAll("input")) as HTMLInputElement[] : []
                      handlePinKeyDown(pinStep === "enter" ? pinDigits : pinConfirmDigits, i, e, refs)
                    }}
                    disabled={pinLoading}
                    className="h-12 w-10 rounded-lg border-2 border-border/60 bg-muted/30 text-center text-xl font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
                  />
                ))}
              </div>
              {pinError && <p className="text-sm text-destructive text-center">{pinError}</p>}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={resetPinForm} className="flex-1">취소</Button>
                <Button size="sm" onClick={handlePinSubmit} disabled={pinLoading || (pinStep === "enter" ? pinDigits : pinConfirmDigits).join("").length !== 4} className="flex-1">
                  {pinLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : pinStep === "enter" ? "다음" : "설정"}
                </Button>
              </div>
            </div>
          ) : pinAuth ? (
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">로그인 비밀번호로 본인 확인을 해주세요</p>
              <input
                autoFocus type="password" value={pinPassword}
                onChange={(e) => { setPinPassword(e.target.value); setPinAuthError("") }}
                onKeyDown={(e) => { if (e.key === "Enter") handlePinAuth() }}
                placeholder="로그인 비밀번호"
                className="w-full rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              {pinAuthError && <p className="text-sm text-destructive">{pinAuthError}</p>}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setPinAuth(false); setPinPassword(""); setPinAuthError(""); setPinAuthAction(null) }} className="flex-1">취소</Button>
                <Button size="sm" onClick={handlePinAuth} disabled={pinAuthLoading || !pinPassword} className="flex-1">
                  {pinAuthLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "확인"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{pinSet ? "PIN 설정됨" : "PIN 미설정"}</p>
                <p className="text-xs text-muted-foreground">
                  {pinSet ? "보관함 접근 시 PIN 입력이 필요합니다" : "PIN을 설정하면 보관함 접근 시 인증이 필요합니다"}
                </p>
              </div>
              {pinSet ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setPinAuthAction("change"); setPinAuth(true) }}>변경</Button>
                  <Button variant="outline" size="sm" onClick={() => { setPinAuthAction("remove"); setPinAuth(true) }} disabled={pinLoading}>
                    {pinLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "해제"}
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setPinMode("set")}>PIN 설정</Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Database className="h-4 w-4" />데이터</CardTitle>
          <CardDescription>데이터를 내보내고 관리하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">데이터 내보내기</p>
              <p className="text-sm text-muted-foreground">DOCX, PDF, JSON, Markdown 형식으로 아이템을 다운로드하세요</p>
            </div>
            <Link href="/"><Button variant="outline" size="sm">피드에서 내보내기</Button></Link>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
