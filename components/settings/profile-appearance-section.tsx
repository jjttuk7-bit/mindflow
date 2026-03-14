"use client"

import { UserSettings } from "@/lib/supabase/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Sun, Moon, Monitor, Smartphone, Type } from "lucide-react"
import { useTheme } from "next-themes"
import { useFontSize, FontSize } from "@/components/font-size-provider"

interface Props {
  email: string | null
  settings: UserSettings | null
}

export function ProfileAppearanceSection({ email, settings }: Props) {
  const { theme, setTheme } = useTheme()
  const { fontSize, setFontSize } = useFontSize()
  const isPro = settings?.plan === "pro"

  return (
    <>
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
              <p className="text-sm text-muted-foreground">현재 구독 플랜</p>
            </div>
            <Badge variant={isPro ? "default" : "secondary"}>
              {isPro ? "Pro" : "Free"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Theme Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sun className="h-4 w-4" />
            테마
          </CardTitle>
          <CardDescription>앱의 외관을 설정하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            {[
              { value: "system", label: "시스템", icon: Monitor },
              { value: "light", label: "라이트", icon: Sun },
              { value: "dark", label: "다크", icon: Moon },
              { value: "black", label: "OLED", icon: Smartphone },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium transition-all ${
                  theme === opt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:border-border hover:bg-muted/30"
                }`}
              >
                <opt.icon className="h-4 w-4" />
                {opt.label}
              </button>
            ))}
          </div>
          {theme === "black" && (
            <p className="text-xs text-muted-foreground mt-2">
              AMOLED 디스플레이에 최적화된 순수 검정 배경
            </p>
          )}
        </CardContent>
      </Card>

      {/* Font Size Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            글자 크기
          </CardTitle>
          <CardDescription>앱 전체의 글자 크기를 조절합니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {([
              { value: "small" as FontSize, label: "작게", sample: "가나다 ABC" },
              { value: "normal" as FontSize, label: "보통", sample: "가나다 ABC" },
              { value: "large" as FontSize, label: "크게", sample: "가나다 ABC" },
            ]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFontSize(opt.value)}
                className={`flex-1 rounded-lg border-2 p-3 text-center transition-colors ${
                  fontSize === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <span className={`block font-medium ${
                  opt.value === "small" ? "text-[12px]" : opt.value === "large" ? "text-[16px]" : "text-[14px]"
                }`}>
                  {opt.sample}
                </span>
                <span className="block text-ui-sm text-muted-foreground mt-1">
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
