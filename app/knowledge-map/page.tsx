"use client"

import { KnowledgeMap } from "@/components/knowledge-map"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function KnowledgeMapPage() {
  return (
    <div className="h-dvh flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
        <Link
          href="/"
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-base font-semibold text-foreground">지식 맵</h1>
          <p className="text-[11px] text-muted-foreground/50">메모 간의 연결을 탐색하세요</p>
        </div>
      </header>

      {/* Map */}
      <div className="flex-1 relative">
        <KnowledgeMap />
      </div>
    </div>
  )
}
