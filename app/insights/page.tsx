"use client"

import { useEffect, useState, useCallback } from "react"
import { InsightReport } from "@/components/insight-report"
import { InsightReportData } from "@/lib/supabase/types"
import { ArrowLeft, BarChart3, Loader2, Calendar, Eye } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ReportListItem {
  id: string
  month: string
  report_type: "weekly" | "monthly"
  created_at: string
}

interface FullReport {
  id: string
  user_id: string
  month: string
  report_type: "weekly" | "monthly"
  report_data: InsightReportData
  created_at: string
}

function formatMonth(month: string): string {
  const date = new Date(month + "T00:00:00")
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long" })
}

function formatWeekRange(month: string): string {
  const start = new Date(month + "T00:00:00")
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const sm = start.getMonth() + 1
  const sd = start.getDate()
  const em = end.getMonth() + 1
  const ed = end.getDate()
  return `${sm}월 ${sd}일 - ${em}월 ${ed}일`
}

export default function InsightsPage() {
  const [tab, setTab] = useState<"weekly" | "monthly">("weekly")
  const [reports, setReports] = useState<ReportListItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<FullReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [isPro, setIsPro] = useState(false)
  const [previewData, setPreviewData] = useState<InsightReportData | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Fetch reports list
  const fetchReports = useCallback(async (type: "weekly" | "monthly") => {
    setLoading(true)
    setSelectedId(null)
    setSelectedReport(null)
    setPreviewData(null)
    try {
      const res = await fetch(`/api/insights?type=${type}`)
      if (res.ok) {
        const data = await res.json()
        setReports(data)
        if (data.length > 0) {
          setSelectedId(data[0].id)
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReports(tab)
  }, [tab, fetchReports])

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
    setPreviewData(null)
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

  // Preview handler
  const handlePreview = async () => {
    setPreviewLoading(true)
    setSelectedId(null)
    setSelectedReport(null)
    try {
      const res = await fetch("/api/insights/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: tab }),
      })
      if (res.ok) {
        const data = await res.json()
        setPreviewData(data.report_data)
      }
    } catch {
      // ignore
    } finally {
      setPreviewLoading(false)
    }
  }

  const formatLabel = (report: ReportListItem) => {
    return report.report_type === "weekly"
      ? formatWeekRange(report.month)
      : formatMonth(report.month)
  }

  const formatDetailTitle = () => {
    if (previewData) {
      return tab === "weekly" ? "이번 주 미리보기" : "이번 달 미리보기"
    }
    if (!selectedReport) return ""
    return selectedReport.report_type === "weekly"
      ? formatWeekRange(selectedReport.month)
      : formatMonth(selectedReport.month)
  }

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
          <div className="ml-auto">
            <button
              onClick={handlePreview}
              disabled={previewLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
            >
              {previewLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
              미리보기
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Tab + Content */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          {/* Sidebar */}
          <div className="w-full md:w-56 flex-shrink-0">
            {/* Segment Control */}
            <div className="flex rounded-lg bg-muted/50 p-0.5 mb-4">
              <button
                onClick={() => setTab("weekly")}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  tab === "weekly"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setTab("monthly")}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  tab === "monthly"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
            </div>

            <p className="text-[10px] tracking-[0.2em] uppercase font-semibold text-muted-foreground/70 mb-3">
              {tab === "weekly" ? "주간 리포트" : "월간 리포트"}
            </p>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : reports.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 py-4 text-center">
                아직 리포트가 없어요
              </p>
            ) : (
              <ScrollArea className="max-h-[calc(100vh-16rem)]">
                <div className="space-y-1.5 pr-2">
                  {reports.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => {
                        setPreviewData(null)
                        setSelectedId(report.id)
                      }}
                      className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-all ${
                        selectedId === report.id && !previewData
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-accent border border-transparent"
                      }`}
                    >
                      <Calendar
                        className={`h-4 w-4 flex-shrink-0 ${
                          selectedId === report.id && !previewData
                            ? "text-primary"
                            : "text-muted-foreground/50"
                        }`}
                      />
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            selectedId === report.id && !previewData
                              ? "text-primary"
                              : "text-foreground/70"
                          }`}
                        >
                          {formatLabel(report)}
                        </p>
                        <p className="text-[11px] text-muted-foreground/50">
                          {new Date(report.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Report detail */}
          <div className="flex-1 min-w-0">
            {previewLoading || detailLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : previewData ? (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <h2 className="font-display text-2xl text-foreground">
                    {formatDetailTitle()}
                  </h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-accent/10 text-amber-accent">
                    Preview
                  </span>
                </div>
                <InsightReport data={previewData} isPro={isPro} reportType={tab} />
              </div>
            ) : selectedReport ? (
              <div>
                <h2 className="font-display text-2xl text-foreground mb-6">
                  {formatDetailTitle()}
                </h2>
                <InsightReport
                  data={selectedReport.report_data}
                  isPro={isPro}
                  reportType={selectedReport.report_type || "monthly"}
                />
              </div>
            ) : !loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h2 className="font-display text-xl text-foreground mb-2">
                  {reports.length === 0 ? "아직 인사이트가 없어요" : "리포트를 선택하세요"}
                </h2>
                {reports.length === 0 && (
                  <p className="text-sm text-muted-foreground max-w-md">
                    {tab === "weekly"
                      ? "주간 인사이트는 매주 월요일에 자동으로 생성됩니다."
                      : "월간 인사이트는 매월 1일에 자동으로 생성됩니다."}
                    <br />
                    미리보기 버튼으로 현재 기간의 리포트를 확인할 수 있어요.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
