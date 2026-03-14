"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function KakaoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#000000" d="M12 3C6.48 3 2 6.48 2 10.5c0 2.58 1.71 4.85 4.29 6.14l-1.1 4.04c-.07.26.2.47.43.34l4.72-3.1c.54.07 1.09.08 1.66.08 5.52 0 10-3.48 10-7.5S17.52 3 12 3z" />
    </svg>
  )
}

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        // Send welcome email
        fetch("/api/auth/welcome", { method: "POST" }).catch(() => {})
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
      window.location.href = "/"
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleOAuth(provider: "google" | "kakao") {
    setError("")
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <a href="/" className="inline-block">
            <h1 className="font-display text-4xl tracking-tight text-foreground hover:text-primary transition-colors cursor-pointer">
              DotLine
            </h1>
          </a>
          <p className="text-sm text-muted-foreground mt-2">
            기록은 내가, 정리는 AI가
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-card-foreground mb-1">
            {isSignUp ? "회원가입" : "로그인"}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {isSignUp
              ? "계정을 만들고 지식 관리를 시작하세요"
              : "계정에 로그인하세요"}
          </p>

          {/* Social Login */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={() => handleOAuth("google")}
              className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-ring/30"
            >
              <GoogleIcon className="w-5 h-5" />
              Google로 계속하기
            </button>
            <button
              type="button"
              onClick={() => handleOAuth("kakao")}
              className="w-full flex items-center justify-center gap-3 rounded-lg bg-[#FEE500] px-4 py-2.5 text-sm font-medium text-[#191919] hover:bg-[#FDD835] focus:outline-none focus:ring-2 focus:ring-[#FEE500]/50"
            >
              <KakaoIcon className="w-5 h-5" />
              카카오로 계속하기
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-3 text-muted-foreground">또는 이메일로</span>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                이메일
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignUp ? "6자 이상 입력하세요" : "비밀번호를 입력하세요"}
                required
                minLength={6}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? (isSignUp ? "계정 생성 중..." : "로그인 중...")
                : (isSignUp ? "계정 만들기" : "로그인")}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-border/40 text-center">
            <p className="text-sm text-muted-foreground">
              {isSignUp ? "이미 계정이 있나요?" : "계정이 없나요?"}{" "}
              <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setError("") }}
                className="text-primary font-medium hover:underline"
              >
                {isSignUp ? "로그인" : "회원가입"}
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-ui-sm text-muted-foreground/50 mt-4">
          계속 진행하면{" "}
          <a href="/terms" className="underline hover:text-muted-foreground">이용약관</a>
          {" "}및{" "}
          <a href="/privacy" className="underline hover:text-muted-foreground">개인정보처리방침</a>
          에 동의하는 것으로 간주됩니다.
        </p>
      </div>
    </div>
  )
}
