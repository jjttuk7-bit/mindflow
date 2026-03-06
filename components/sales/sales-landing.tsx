"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Mic, CreditCard, Bell, Sparkles, Users, TrendingUp,
  CheckCircle2, ArrowRight, Star, Zap, Shield, Clock,
  PhoneCall, BarChart3, MessageCircle,
} from "lucide-react"

const FEATURES = [
  {
    icon: Users,
    title: "스마트 고객 카드",
    desc: "등급/온도 자동 계산, 활동 타임라인, AI 연락 타이밍 추천",
    color: "text-blue-500",
  },
  {
    icon: Mic,
    title: "미팅 즉시 캡처",
    desc: "원터치 녹음 → 자동 전사 → AI가 약속/예산/경쟁사 추출",
    color: "text-purple-500",
  },
  {
    icon: CreditCard,
    title: "명함 AI 스캔",
    desc: "명함 촬영만으로 고객 카드 자동 생성, OCR 정확도 95%+",
    color: "text-emerald-500",
  },
  {
    icon: Bell,
    title: "후속 알림 엔진",
    desc: "연락 누락 경고, 기한 초과 알림, 딜 마감 D-Day 카운트",
    color: "text-amber-500",
  },
  {
    icon: Sparkles,
    title: "AI 영업 파트너",
    desc: "미팅 브리핑, 고객 롤플레이, 리뷰 코칭, 인사이트 리포트",
    color: "text-red-500",
  },
  {
    icon: TrendingUp,
    title: "딜 파이프라인",
    desc: "단계별 딜 관리, 성사 확률 추적, 예상 매출 한눈에",
    color: "text-cyan-500",
  },
]

const PLANS = [
  {
    name: "Free",
    price: "무료",
    period: "",
    desc: "시작하기 좋은 기본 플랜",
    features: [
      "고객 5명까지",
      "AI 채팅 3회/일",
      "기본 활동 기록",
      "팔로업 알림",
    ],
    cta: "무료로 시작",
    highlight: false,
  },
  {
    name: "Pro",
    price: "19,900",
    period: "원/월",
    desc: "개인 영업인을 위한 완전체",
    features: [
      "무제한 고객",
      "무제한 AI 기능",
      "미팅 캡처 & 자동 전사",
      "명함 OCR 스캔",
      "AI 롤플레이 모드",
      "딜 파이프라인",
      "고급 인사이트 리포트",
    ],
    cta: "Pro 시작하기",
    highlight: true,
  },
  {
    name: "Team",
    price: "14,900",
    period: "원/인/월",
    desc: "팀 협업과 관리를 위한 플랜",
    features: [
      "Pro의 모든 기능",
      "팀 고객 공유",
      "팀 활동 리포트",
      "관리자 대시보드",
      "CRM 연동 (예정)",
    ],
    cta: "팀 문의하기",
    highlight: false,
  },
]

const TESTIMONIALS = [
  {
    name: "김영업",
    role: "보험설계사 7년차",
    content: "미팅 녹음 → AI 요약이 게임체인저입니다. 약속을 까먹는 일이 없어졌어요.",
    rating: 5,
  },
  {
    name: "이상담",
    role: "부동산 컨설턴트",
    content: "고객 온도 점수 덕분에 누구에게 먼저 연락해야 할지 바로 알 수 있어요.",
    rating: 5,
  },
  {
    name: "박매니저",
    role: "자동차 영업 팀장",
    content: "AI 롤플레이로 신입 교육하고 있습니다. 실전 감각이 확 올라갑니다.",
    rating: 5,
  },
]

export function SalesLanding() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleBetaSignup = async () => {
    if (!email.trim() || !email.includes("@")) {
      toast.error("올바른 이메일을 입력해주세요")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/sales/beta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }

      setSubmitted(true)
      toast.success("베타 신청이 완료되었습니다!")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "신청에 실패했습니다")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">
              DotLine <span className="text-primary">Sales</span>
            </h1>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">BETA</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              DotLine Core
            </a>
            <button
              onClick={() => router.push("/login")}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              로그인
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
          <Zap className="h-4 w-4" />
          AI 기반 영업 관리의 새로운 기준
        </div>
        <h2 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
          미팅 메모가<br />
          <span className="text-primary">고객 인텔리전스</span>로
        </h2>
        <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto leading-relaxed">
          녹음 한 번이면 AI가 고객명, 약속, 예산을 자동 추출합니다.<br />
          연락 타이밍 추천부터 롤플레이 연습까지, 당신의 AI 영업 파트너.
        </p>
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => router.push("/login")}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-base font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20"
          >
            무료로 시작하기
            <ArrowRight className="h-4 w-4" />
          </button>
          <a
            href="#features"
            className="px-6 py-3 rounded-xl text-base font-medium border border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            기능 둘러보기
          </a>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center justify-center gap-8 mt-12 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Shield className="h-4 w-4" />
            데이터 암호화
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            5분 내 시작
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            신용카드 불필요
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <h3 className="text-2xl font-bold text-center mb-2">핵심 기능</h3>
        <p className="text-center text-muted-foreground mb-10">영업의 모든 순간을 AI가 함께합니다</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-md hover:border-border transition-all"
              >
                <Icon className={`h-8 w-8 ${f.color} mb-3`} />
                <h4 className="font-semibold mb-1">{f.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/30 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h3 className="text-2xl font-bold text-center mb-10">이렇게 작동합니다</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            {[
              { step: "1", icon: PhoneCall, title: "고객 만남", desc: "미팅/통화 시 녹음 버튼 한 번" },
              { step: "2", icon: Sparkles, title: "AI 자동 분석", desc: "전사 → 약속/예산/경쟁사 추출" },
              { step: "3", icon: Bell, title: "스마트 알림", desc: "후속 조치 자동 생성 & 리마인드" },
              { step: "4", icon: BarChart3, title: "인사이트", desc: "관계 온도, 딜 분석, 전략 추천" },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.step} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-[10px] text-primary font-bold mb-1">STEP {item.step}</div>
                  <h4 className="font-semibold text-sm mb-1">{item.title}</h4>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <h3 className="text-2xl font-bold text-center mb-2">사용자 후기</h3>
        <p className="text-center text-muted-foreground mb-10">베타 테스터들의 생생한 경험</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border/60 p-5">
              <div className="flex gap-0.5 mb-3">
                {[...Array(t.rating)].map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm leading-relaxed mb-3">&ldquo;{t.content}&rdquo;</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-muted/30 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h3 className="text-2xl font-bold text-center mb-2">요금제</h3>
          <p className="text-center text-muted-foreground mb-10">규모에 맞는 플랜을 선택하세요</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`bg-card rounded-2xl border-2 p-6 relative ${
                  plan.highlight
                    ? "border-primary shadow-lg shadow-primary/10 scale-105"
                    : "border-border/60"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                    인기
                  </div>
                )}
                <h4 className="font-bold text-lg">{plan.name}</h4>
                <div className="mt-2 mb-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
                </div>
                <p className="text-xs text-muted-foreground mb-4">{plan.desc}</p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${plan.highlight ? "text-primary" : "text-muted-foreground"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => router.push("/login")}
                  className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    plan.highlight
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-border/60 text-foreground hover:bg-accent"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Beta CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-3xl border border-primary/20 p-8 sm:p-12 text-center">
          <MessageCircle className="h-10 w-10 text-primary mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">베타 테스터 모집 중</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            현재 무료 베타 운영 중입니다. 이메일을 남겨주시면 초대장을 보내드립니다.
          </p>
          {submitted ? (
            <div className="flex items-center justify-center gap-2 text-primary font-medium">
              <CheckCircle2 className="h-5 w-5" />
              신청 완료! 곧 초대장을 보내드리겠습니다.
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                onKeyDown={(e) => e.key === "Enter" && handleBetaSignup()}
                className="flex-1 px-4 py-3 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={handleBetaSignup}
                disabled={submitting}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex-shrink-0"
              >
                {submitting ? "신청 중..." : "베타 신청"}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-muted-foreground">
          <p>DotLine Sales by DotLine</p>
          <div className="flex items-center gap-4">
            <a href="/terms" className="hover:text-foreground transition-colors">이용약관</a>
            <a href="/privacy" className="hover:text-foreground transition-colors">개인정보처리방침</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
