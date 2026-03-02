"use client"

import { useEffect, useState, useCallback } from "react"
import { InsightReport } from "@/components/insight-report"
import { InsightReportData } from "@/lib/supabase/types"
import { ArrowLeft, BarChart3, Loader2, Calendar } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ReportListItem {
  id: string
  month: string
  created_at: string
}

interface FullReport {
  id: string
  user_id: string
  month: string
  report_data: InsightReportData
  created_at: string
}

function formatMonth(month: string): string {
  const date = new Date(month + "T00:00:00")
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long" })
}

export default function InsightsPage() {
  const [reports, setReports] = useState<ReportListItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<FullReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [isPro, setIsPro] = useState(false)

  // Fetch reports list
  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await fetch("/api/insights")
        if (res.ok) {
          const data = await res.json()
          setReports(data)
          // Auto-select first report
          if (data.length > 0) {
            setSelectedId(data[0].id)
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [])

  // Check if user is pro
  useEffect(() => {
    async function checkPlan() {
      try {
        const res = await fetch("/api/settings")
        if (res.ok) {
          const data = await res.json()
          setIsPro(data.plan === "pro")
        }
      } catch {
        // ignore
      }
    }
    checkPlan()
  }, [])

  // Fetch selected report detail
  const fetchDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/insights/${id}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedReport(data)
      }
    } catch {
      // ignore
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedId) {
      fetchDetail(selectedId)
    }
  }, [selectedId, fetchDetail])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <a
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            돌아가기
          </a>
          <div className="h-4 w-px bg-border/60" />
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h1 className="font-display text-xl text-foreground">Insights</h1>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h2 className="font-display text-xl text-foreground mb-2">아직 인사이트가 없어요</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              월간 인사이트 리포트는 매월 1일에 자동으로 생성됩니다.
              기록을 계속하면 여기에 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
            {/* Report list sidebar */}
            <div className="w-full md:w-56 flex-shrink-0">
              <p className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground/70 mb-3">
                월간 리포트
              </p>
              <ScrollArea className="max-h-[calc(100vh-12rem)]">
                <div className="space-y-1.5 pr-2">
                  {reports.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedId(report.id)}
                      className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-all ${
                        selectedId === report.id
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-accent border border-transparent"
                      }`}
                    >
                      <Calendar
                        className={`h-4 w-4 flex-shrink-0 ${
                          selectedId === report.id
                            ? "text-primary"
                            : "text-muted-foreground/50"
                        }`}
                      />
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            selectedId === report.id
                              ? "text-primary"
                              : "text-foreground/70"
                          }`}
                        >
                          {formatMonth(report.month)}
                        </p>
                        <p className="text-[11px] text-muted-foreground/50">
                          {new Date(report.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Report detail */}
            <div className="flex-1 min-w-0">
              {detailLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : selectedReport ? (
                <div>
                  <h2 className="font-display text-2xl text-foreground mb-6">
                    {formatMonth(selectedReport.month)}
                  </h2>
                  <InsightReport data={selectedReport.report_data} isPro={isPro} />
                </div>
              ) : (
                <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
                  리포트를 선택하세요
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
