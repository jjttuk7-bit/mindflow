"use client"

import { useState } from "react"
import {
  FileText,
  Tag,
  MessageSquare,
  CheckSquare,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
} from "lucide-react"

const steps = [
  {
    icon: Sparkles,
    title: "DotLine에 오신 것을 환영합니다!",
    description:
      "기록은 내가, 정리는 AI가. 아이디어, 링크, 이미지, 음성 메모를 한곳에 담고 AI가 자동으로 정리해 드립니다.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: FileText,
    title: "무엇이든 빠르게 기록하세요",
    description:
      "상단 입력창에 떠오르는 생각을 적으세요. 텍스트, 웹 링크, 이미지, 음성 녹음까지 모두 지원합니다.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Tag,
    title: "AI가 자동으로 태그합니다",
    description:
      "기록을 저장하면 AI가 내용을 분석해 관련 태그를 자동 추천합니다. 프로젝트와 스마트 폴더로 깔끔하게 분류하세요.",
    color: "text-terracotta",
    bg: "bg-terracotta/10",
  },
  {
    icon: MessageSquare,
    title: "AI에게 질문하세요",
    description:
      "오른쪽 AI Chat에서 저장한 지식에 대해 자유롭게 질문하세요. 내 노트를 기반으로 답변을 제공합니다.",
    color: "text-sage",
    bg: "bg-sage/10",
  },
  {
    icon: CheckSquare,
    title: "생각을 행동으로 옮기세요",
    description:
      "사이드바의 TODO에서 할 일을 관리하세요. 아이디어를 바로 실행 가능한 작업으로 만들 수 있습니다.",
    color: "text-dusty-rose",
    bg: "bg-dusty-rose/10",
  },
]

interface OnboardingProps {
  onComplete: () => void
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0)
  const current = steps[step]
  const isLast = step === steps.length - 1
  const Icon = current.icon

  async function handleComplete() {
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: { onboarding_completed: true },
        }),
      })
    } catch {
      // 저장 실패해도 온보딩은 닫기
    }
    onComplete()
  }

  function handleSkip() {
    handleComplete()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border/60 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step
                    ? "w-6 bg-primary"
                    : i < step
                    ? "w-3 bg-primary/40"
                    : "w-3 bg-muted"
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleSkip}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-accent/60"
            aria-label="건너뛰기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-8 text-center">
          <div
            className={`w-16 h-16 rounded-2xl ${current.bg} flex items-center justify-center mx-auto mb-6`}
          >
            <Icon className={`w-8 h-8 ${current.color}`} />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            {current.title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            {current.description}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between">
          <button
            onClick={() => setStep(step - 1)}
            disabled={step === 0}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-0 disabled:cursor-default"
          >
            <ArrowLeft className="w-4 h-4" />
            이전
          </button>

          {isLast ? (
            <button
              onClick={handleComplete}
              className="flex items-center gap-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 px-6 py-2.5 rounded-lg"
            >
              시작하기
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 px-6 py-2.5 rounded-lg"
            >
              다음
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
