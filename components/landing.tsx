"use client"

import Link from "next/link"
import {
  Sparkles,
  Mic,
  Image,
  Link2,
  FileText,
  Tag,
  MessageSquare,
  CheckSquare,
  Share2,
  ArrowRight,
  Zap,
  Shield,
  Globe,
  Moon,
  Sun,
  Flame,
  PenTool,
  TrendingUp,
  Briefcase,
  Network,
  Bot,
  Layers,
} from "lucide-react"
import { useTheme } from "@/hooks/use-theme"
import { DotLineLogo } from "@/components/dotline-logo"

function ThemeToggle() {
  const { dark, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60"
      aria-label="테마 전환"
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}

function Navbar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DotLineLogo className="w-6 h-6 text-primary" />
          <span className="font-display text-xl tracking-tight text-foreground">
            DotLine
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-accent/60"
          >
            로그인
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 px-4 py-2 rounded-lg"
          >
            시작하기
          </Link>
        </div>
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <section className="pt-32 pb-20 sm:pt-40 sm:pb-28 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          AI Knowledge Companion
        </div>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl tracking-tight text-foreground leading-[1.1]">
          기록하면 AI가 정리하고,
          <br />
          <span className="text-primary">성과로 만들어 줍니다</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          아이디어, 링크, 이미지, 음성을 한곳에 담으세요. AI가 자동 태깅하고,
          실시간 대화로 지식을 검색하고, 블로그 글이나 제안서까지 만들어 줍니다.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-medium text-primary-foreground bg-primary hover:bg-primary/90 px-8 py-3.5 rounded-xl shadow-sm"
          >
            무료로 시작하기
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto inline-flex items-center justify-center text-base font-medium text-foreground bg-secondary hover:bg-secondary/80 px-8 py-3.5 rounded-xl"
          >
            기능 살펴보기
          </a>
        </div>
        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground/60">
          <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> 개인 데이터 보호</span>
          <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> 30초 만에 시작</span>
          <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> 무료 플랜 제공</span>
        </div>
      </div>
    </section>
  )
}

const captureTypes = [
  { icon: FileText, label: "텍스트 & 아이디어", desc: "생각나는 모든 것을 즉시 기록", color: "text-primary" },
  { icon: Link2, label: "웹 링크", desc: "OG 메타데이터 자동 추출", color: "text-sage" },
  { icon: Image, label: "이미지 & 스크린샷", desc: "AI가 텍스트까지 추출", color: "text-dusty-rose" },
  { icon: Mic, label: "음성 메모", desc: "AI 전사로 텍스트 변환", color: "text-terracotta" },
]

function CaptureSection() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-foreground">
            무엇이든, 바로 Capture
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
            웹, 크롬 확장, 텔레그램, 모바일 공유 — 어디서든 한 번에 저장하세요.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {captureTypes.map(({ icon: Icon, label, desc, color }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-3 p-6 sm:p-8 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-border transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/60 flex items-center justify-center">
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <span className="text-sm font-medium text-foreground">{label}</span>
              <span className="text-[11px] text-muted-foreground/60 text-center">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const coreFeatures = [
  {
    icon: Layers,
    title: "다차원 스마트 태깅",
    description:
      "AI가 분야, 주제, 행동, 맥락 4축으로 3~5개 태그를 자동 생성합니다. 기존 태그를 학습해서 일관된 분류 체계를 유지합니다.",
    badge: "Upgraded",
  },
  {
    icon: Bot,
    title: "AI 지식 동반자",
    description:
      "저장된 지식을 기반으로 실시간 스트리밍 대화. 할 일, 프로젝트, 최근 활동까지 인식하는 똑똑한 AI 채팅입니다.",
    badge: "New",
  },
  {
    icon: PenTool,
    title: "콘텐츠 생성",
    description:
      "저장한 지식을 블로그 글, SNS 포스트, 뉴스레터, 이메일 초안으로 변환하세요. AI가 초안을 써줍니다.",
    badge: "New",
  },
  {
    icon: Globe,
    title: "어디서나 수집",
    description:
      "웹 앱, 크롬 확장, 텔레그램 봇, 모바일 공유 — 4가지 방법으로 언제 어디서든 바로 저장하세요.",
  },
]

const moreFeatures = [
  { icon: TrendingUp, title: "트렌드 분석", description: "저장 패턴에서 관심 분야 변화를 감지하고 새로운 기회를 발견합니다." },
  { icon: Briefcase, title: "비즈니스 지원", description: "미팅 정리, 제안서 초안, 프로젝트 현황 보고를 자동 작성합니다." },
  { icon: Flame, title: "스트릭 & 습관", description: "연속 사용일 카운트와 데일리 브리핑으로 기록 습관을 만듭니다." },
  { icon: MessageSquare, title: "스트리밍 AI 응답", description: "실시간 타이핑 답변, 대화 맥락 기억, 즉시 메모 저장." },
  { icon: Network, title: "지식 맵 & 연결", description: "네트워크 그래프로 항목 간 관계를 시각화합니다." },
  { icon: CheckSquare, title: "스마트 할 일", description: "AI가 액션 아이템을 자동 추출, 프로젝트별 관리." },
  { icon: Tag, title: "AI 프로젝트 분류", description: "콘텐츠 주제를 분석해 프로젝트에 자동 분류합니다." },
  { icon: Zap, title: "인사이트 리포트", description: "월간 트렌드, 활동 히트맵, 리마인더를 한눈에." },
]

function FeaturesSection() {
  return (
    <section id="features" className="py-20 sm:py-28 px-4 sm:px-6 scroll-mt-16">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-foreground">
            저장을 넘어, 성과를 만드는 도구
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
            기록과 정리는 기본. AI가 지식을 블로그 글, 제안서, 인사이트로 전환해 줍니다.
          </p>
        </div>

        {/* Core features — large 2x2 grid */}
        <div className="grid sm:grid-cols-2 gap-6 sm:gap-8 mb-16">
          {coreFeatures.map(({ icon: Icon, title, description, badge }) => (
            <div key={title} className="group relative p-8 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-border transition-all duration-200">
              {badge && (
                <span className={`absolute top-5 right-5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  badge === "New" ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-600"
                }`}>
                  {badge}
                </span>
              )}
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>

        {/* More features — compact 2x4 grid */}
        <div>
          <p className="text-center text-xs tracking-[0.2em] uppercase font-semibold text-muted-foreground/60 mb-6">
            더 많은 기능
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {moreFeatures.map(({ icon: Icon, title, description }) => (
              <div key={title} className="group p-4 rounded-xl bg-card border border-border/40 hover:border-border/60 transition-all duration-200">
                <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center mb-3 group-hover:bg-primary/12 transition-colors">
                  <Icon className="w-4 h-4 text-primary/80" />
                </div>
                <h3 className="text-sm font-medium text-foreground mb-1">{title}</h3>
                <p className="text-xs text-muted-foreground/70 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

const aiExamples = [
  { icon: "💬", question: "이번 주 저장한 개발 내용 정리해줘", answer: "저장된 5개 항목을 분석하여 React 성능 최적화, TypeScript 마이그레이션 관련 내용을 주제별로 정리했습니다..." },
  { icon: "📝", question: "이 내용으로 블로그 글 써줘", answer: "저장된 자료를 바탕으로 'React 성능 최적화 실전 가이드' 초안을 작성했습니다. 소개 → 문제 진단 → 해결법 → 결론 구조로..." },
  { icon: "📊", question: "최근 내 관심사 트렌드 분석해줘", answer: "최근 2주간 AI/ML 관련 저장이 40% 증가했습니다. 특히 LLM 파인튜닝에 집중되어 있으며..." },
  { icon: "💼", question: "클라이언트 미팅 내용 정리해줘", answer: "미팅 핵심 요약: 1) Q3 목표 매출 20% 성장 합의 2) 신규 기능 3개 우선순위 확정. 액션 아이템: ..." },
]

function AIShowcase() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full mb-4">
            <Bot className="w-3.5 h-3.5" />
            AI Knowledge Companion
          </div>
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-foreground">
            대화하듯 지식을 활용하세요
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
            검색, 정리, 콘텐츠 생성, 비즈니스 지원까지 — 채팅 한 곳에서 모두 가능합니다.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
          {aiExamples.map(({ icon, question, answer }) => (
            <div key={question} className="rounded-2xl bg-card border border-border/50 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-lg">{icon}</span>
                <p className="text-sm font-medium text-foreground">&quot;{question}&quot;</p>
              </div>
              <div className="ml-8 rounded-xl bg-muted/60 px-4 py-3">
                <p className="text-xs text-muted-foreground leading-relaxed">{answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const steps = [
  { num: "1", title: "Capture", description: "텍스트, 링크, 이미지, 음성 — 무엇이든 한 번에 저장하세요." },
  { num: "2", title: "Organize", description: "AI가 4축 태깅, 요약, 프로젝트 분류까지 자동 처리합니다." },
  { num: "3", title: "Discover", description: "대화하듯 지식을 검색하고, 숨겨진 연결과 인사이트를 발견하세요." },
  { num: "4", title: "Create", description: "저장된 지식을 블로그 글, 제안서, SNS 포스트로 전환하세요." },
]

function HowItWorks() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-foreground">
            4단계로 지식이 성과가 됩니다
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {steps.map(({ num, title, description }, idx) => (
            <div key={num} className="text-center relative">
              {idx < steps.length - 1 && (
                <div className="hidden lg:block absolute top-6 left-[60%] w-[80%] h-px border-t-2 border-dashed border-border/40" />
              )}
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground text-lg font-semibold flex items-center justify-center mx-auto mb-4 relative z-10">
                {num}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function StreakSection() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-500 bg-orange-500/10 px-3 py-1.5 rounded-full mb-4">
              <Flame className="w-3.5 h-3.5" />
              Streak System
            </div>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-foreground">
              매일 기록하는 습관
            </h2>
            <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
              매일 DotLine에 접속하면 연속 사용일이 카운트됩니다.
              스마트 인사말과 데일리 브리핑이 꾸준한 기록 습관을 응원합니다.
            </p>
            <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-3">
              <span className="inline-flex items-center gap-1.5 text-sm bg-card border border-border/50 px-3 py-1.5 rounded-lg text-foreground/80">
                🔥 스트릭 배지
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm bg-card border border-border/50 px-3 py-1.5 rounded-lg text-foreground/80">
                🌅 스마트 인사말
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm bg-card border border-border/50 px-3 py-1.5 rounded-lg text-foreground/80">
                📊 데일리 브리핑
              </span>
            </div>
          </div>
          <div className="flex-shrink-0">
            <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl bg-gradient-to-br from-orange-500/20 via-primary/10 to-amber-500/20 border border-orange-500/20 flex flex-col items-center justify-center gap-2">
              <span className="text-5xl sm:text-6xl">🔥</span>
              <span className="text-3xl sm:text-4xl font-bold text-foreground">14일</span>
              <span className="text-xs text-muted-foreground">연속 사용 중</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const securityItems = [
  {
    icon: Shield,
    title: "End-to-end 암호화",
    description: "전송 구간 전체 HTTPS/TLS 암호화. 비밀번호는 해시 처리되어 저장됩니다.",
  },
  {
    icon: Layers,
    title: "Row-level 보안",
    description: "Supabase RLS 정책으로 사용자별 데이터가 완전히 격리됩니다. 다른 사람이 내 데이터에 접근할 수 없습니다.",
  },
  {
    icon: Share2,
    title: "내 데이터는 내 것",
    description: "AI 학습에 데이터를 사용하지 않습니다. 언제든 전체 데이터를 내보내거나 삭제할 수 있습니다.",
  },
]

function SecuritySection() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-sage bg-sage/10 px-3 py-1.5 rounded-full mb-4">
            <Shield className="w-3.5 h-3.5" />
            Security First
          </div>
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-foreground">
            당신의 지식은 안전합니다
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
            보안은 선택이 아닌 기본. 모든 데이터는 암호화되고 철저히 격리됩니다.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {securityItems.map(({ icon: Icon, title, description }) => (
            <div key={title} className="text-center p-6 rounded-2xl border border-border/40 bg-card">
              <div className="w-11 h-11 rounded-xl bg-sage/10 flex items-center justify-center mx-auto mb-4">
                <Icon className="w-5 h-5 text-sage" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const plans = [
  {
    name: "Free",
    price: "무료",
    desc: "핵심 기능으로 시작하기",
    features: ["AI 채팅 5회/일", "다차원 스마트 태깅", "스트릭 & 데일리 브리핑", "프로젝트 3개", "크롬 확장 & 텔레그램"],
    cta: "무료로 시작",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$9.99/월",
    desc: "무제한 AI + 고급 인사이트",
    features: ["AI 채팅 무제한", "콘텐츠 생성 & 비즈니스 지원", "AI 프로필 분석", "월간 인사이트 리포트", "프로젝트 & 검색 무제한"],
    cta: "Pro 시작하기",
    highlight: true,
  },
]

function PricingSection() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-foreground">
            심플한 요금제
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            무료로 시작하고, 필요할 때 업그레이드하세요.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {plans.map(({ name, price, desc, features: feats, cta, highlight }) => (
            <div
              key={name}
              className={`rounded-2xl p-6 sm:p-8 ${
                highlight
                  ? "bg-primary/5 border-2 border-primary/30 shadow-lg"
                  : "bg-card border border-border/50 shadow-sm"
              }`}
            >
              <h3 className="text-lg font-semibold text-foreground">{name}</h3>
              <p className="text-3xl font-bold text-foreground mt-2">{price}</p>
              <p className="text-sm text-muted-foreground mt-1">{desc}</p>
              <ul className="mt-6 space-y-3">
                {feats.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                    <CheckSquare className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className={`mt-8 block text-center text-sm font-medium py-3 rounded-xl transition-colors ${
                  highlight
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                {cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 bg-muted/30">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-foreground">
          지식을 쌓고, 성과를 만드세요
        </h2>
        <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
          무료로 시작할 수 있습니다. 카드 등록 불필요. 30초면 시작할 수 있어요.
        </p>
        <div className="mt-10">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-base font-medium text-primary-foreground bg-primary hover:bg-primary/90 px-10 py-4 rounded-xl shadow-sm"
          >
            나만의 DotLine 시작하기
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border/40 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <DotLineLogo className="w-4 h-4" />
          <span className="text-sm">&copy; 2026 DotLine</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/terms" className="hover:text-foreground">이용약관</Link>
          <Link href="/privacy" className="hover:text-foreground">개인정보처리방침</Link>
          <Link href="/login" className="hover:text-foreground">로그인</Link>
        </div>
      </div>
    </footer>
  )
}

export function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <CaptureSection />
        <FeaturesSection />
        <AIShowcase />
        <HowItWorks />
        <StreakSection />
        <PricingSection />
        <SecuritySection />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
