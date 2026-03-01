"use client"

import Link from "next/link"
import {
  Brain,
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
} from "lucide-react"
import { useTheme } from "@/hooks/use-theme"

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
          <Brain className="w-6 h-6 text-primary" />
          <span className="font-display text-xl tracking-tight text-foreground">
            Mindflow
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
          AI-Powered Knowledge Manager
        </div>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl tracking-tight text-foreground leading-[1.1]">
          기록은 내가,
          <br />
          <span className="text-primary">정리는 AI가</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          아이디어, 링크, 이미지, 음성 메모를 한곳에 담아보세요.
          AI가 자동으로 태그하고, 연결하고, 인사이트를 발견해 줍니다.
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
      </div>
    </section>
  )
}

const captureTypes = [
  { icon: FileText, label: "텍스트 & 아이디어", color: "text-primary" },
  { icon: Link2, label: "웹 링크", color: "text-sage" },
  { icon: Image, label: "이미지", color: "text-dusty-rose" },
  { icon: Mic, label: "음성 메모", color: "text-terracotta" },
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
            머릿속에 떠오르는 모든 것을 기록하세요. 텍스트, 링크, 이미지, 음성까지 Mindflow가 깔끔하게 담아줍니다.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {captureTypes.map(({ icon: Icon, label, color }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-3 p-6 sm:p-8 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-border"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/60 flex items-center justify-center">
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <span className="text-sm font-medium text-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const features = [
  {
    icon: Tag,
    title: "Smart AI Tagging",
    description:
      "AI가 콘텐츠를 분석해 관련 태그를 자동으로 추천합니다. 더 이상 수동 분류는 필요 없어요 — 그냥 쓰면, Mindflow가 정리합니다.",
  },
  {
    icon: MessageSquare,
    title: "AI Chat Assistant",
    description:
      "저장한 지식에 대해 자유롭게 질문하세요. AI가 관련 항목을 찾아, 내 노트에 기반한 답변을 제공합니다.",
  },
  {
    icon: CheckSquare,
    title: "Integrated Todos",
    description:
      "생각을 바로 행동으로 옮기세요. 아이디어와 프로젝트에 연결된 할 일 목록을 하나의 워크플로우에서 관리합니다.",
  },
  {
    icon: Share2,
    title: "Share & Collaborate",
    description:
      "개별 항목을 공유하거나 공개 프로필을 구성하세요. 원클릭으로 공유 링크를 생성해 누구와도 쉽게 협업할 수 있습니다.",
  },
  {
    icon: Zap,
    title: "AI Summaries & Insights",
    description:
      "나의 사고 패턴에 대한 주간 인사이트를 받아보세요. AI가 모든 노트를 분석해 큰 그림을 보여줍니다.",
  },
  {
    icon: Globe,
    title: "Link Previews",
    description:
      "URL을 저장하면 Mindflow가 자동으로 제목, 설명, 이미지를 가져옵니다. 북마크가 한눈에 보기 좋게 정리됩니다.",
  },
]

function FeaturesSection() {
  return (
    <section id="features" className="py-20 sm:py-28 px-4 sm:px-6 scroll-mt-16">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-foreground">
            명확하게 사고하기 위한 모든 것
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
            Mindflow는 기록, 정리, AI 인텔리전스를 하나의 우아한 도구에 담았습니다.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="group p-6 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const steps = [
  { num: "1", title: "Capture", description: "텍스트를 쓰거나, 링크를 붙이거나, 이미지를 올리거나, 음성을 녹음하세요." },
  { num: "2", title: "Organize", description: "AI가 콘텐츠를 자동 태그합니다. 프로젝트와 스마트 폴더로 깔끔하게 분류하세요." },
  { num: "3", title: "Discover", description: "나만의 지식 베이스에 질문하세요. 놓쳤던 연결고리와 인사이트를 발견합니다." },
]

function HowItWorks() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-foreground">
            3단계로 간단하게
          </h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-8 sm:gap-10">
          {steps.map(({ num, title, description }) => (
            <div key={num} className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground text-lg font-semibold flex items-center justify-center mx-auto mb-4">
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

function SecurityBadge() {
  return (
    <section className="py-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-accent/40 px-4 py-2 rounded-full">
          <Shield className="w-4 h-4 text-sage" />
          End-to-end 암호화 &middot; Row-level 보안 &middot; 내 데이터는 내 것
        </div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="font-display text-3xl sm:text-4xl tracking-tight text-foreground">
          지금 바로 생각을 정리하세요
        </h2>
        <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
          무료로 사용할 수 있습니다. 신용카드 불필요. 1분이면 시작할 수 있어요.
        </p>
        <div className="mt-10">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-base font-medium text-primary-foreground bg-primary hover:bg-primary/90 px-10 py-4 rounded-xl shadow-sm"
          >
            나만의 Mindflow 만들기
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
          <Brain className="w-4 h-4" />
          <span className="text-sm">&copy; 2026 Mindflow</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/login" className="hover:text-foreground">
            로그인
          </Link>
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
        <HowItWorks />
        <SecurityBadge />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
