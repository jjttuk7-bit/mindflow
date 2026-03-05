"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"

function isValidUrl(str: string): boolean {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

function ShareTargetContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<"saving" | "success" | "error">("saving")
  const [message, setMessage] = useState("공유된 내용을 저장하는 중...")

  useEffect(() => {
    async function saveSharedContent() {
      const title = searchParams.get("title") || ""
      const text = searchParams.get("text") || ""
      const url = searchParams.get("url") || ""

      // Determine content and type
      const sharedUrl = url || (text && isValidUrl(text.trim()) ? text.trim() : null)
      let type: "text" | "link" = "text"
      let content = ""

      if (sharedUrl) {
        type = "link"
        content = sharedUrl
      } else {
        type = "text"
        const parts = [title, text].filter(Boolean)
        content = parts.join("\n\n")
      }

      if (!content.trim()) {
        setStatus("error")
        setMessage("공유된 내용이 비어있습니다")
        setTimeout(() => router.replace("/"), 2000)
        return
      }

      try {
        const res = await fetch("/api/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, content: content.trim() }),
        })

        if (res.status === 401) {
          setStatus("error")
          setMessage("로그인이 필요합니다")
          setTimeout(() => router.replace("/login"), 1500)
          return
        }

        if (!res.ok) throw new Error("Save failed")

        await res.json()

        // AI tagging is handled server-side via after() in the API route

        setStatus("success")
        setMessage("저장 완료!")
        toast.success("공유된 콘텐츠가 저장되었습니다!")
        setTimeout(() => router.replace("/"), 1000)
      } catch {
        setStatus("error")
        setMessage("저장에 실패했습니다")
        setTimeout(() => router.replace("/"), 2000)
      }
    }

    saveSharedContent()
  }, [searchParams, router])

  return (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        {status === "saving" && <Loader2 className="h-10 w-10 text-primary animate-spin" />}
        {status === "success" && <CheckCircle className="h-10 w-10 text-green-500" />}
        {status === "error" && <AlertCircle className="h-10 w-10 text-destructive" />}
      </div>
      <p className="text-lg font-medium text-foreground">{message}</p>
      <p className="text-sm text-muted-foreground">잠시 후 메인 화면으로 이동합니다</p>
    </div>
  )
}

export default function ShareTargetPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Suspense fallback={<Loader2 className="h-10 w-10 text-primary animate-spin" />}>
        <ShareTargetContent />
      </Suspense>
    </div>
  )
}
