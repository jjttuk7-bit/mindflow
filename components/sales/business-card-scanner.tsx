"use client"

import { useState, useRef } from "react"
import { toast } from "sonner"
import { X, Camera, Upload, Loader2, Check, User, Building2, Phone, Mail, CreditCard } from "lucide-react"

type ExtractedInfo = {
  name: string
  company: string | null
  role: string | null
  phone: string | null
  email: string | null
  address: string | null
  website: string | null
  confidence: number
}

export function BusinessCardScanner({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (customerId: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [extracted, setExtracted] = useState<ExtractedInfo | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 지원됩니다")
      return
    }

    // Preview
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("image", file)

      const res = await fetch("/api/sales/business-card", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "명함 인식 실패")
      }

      const data = await res.json()
      setExtracted(data.extracted)
      setCustomerId(data.customer.id)
      toast.success(`${data.extracted.name} 고객이 자동 생성되었습니다`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "명함 인식에 실패했습니다")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card rounded-2xl border border-border/60 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            명함 스캔
          </h2>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {!preview && !uploading && (
            <>
              {/* Upload buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => cameraRef.current?.click()}
                  className="flex flex-col items-center gap-2 py-8 rounded-xl border-2 border-dashed border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
                >
                  <Camera className="h-8 w-8" />
                  <span className="text-sm">카메라 촬영</span>
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center gap-2 py-8 rounded-xl border-2 border-dashed border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
                >
                  <Upload className="h-8 w-8" />
                  <span className="text-sm">갤러리에서</span>
                </button>
              </div>
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <p className="text-xs text-center text-muted-foreground">
                명함 사진을 찍거나 업로드하면 AI가 자동으로 정보를 추출합니다
              </p>
            </>
          )}

          {uploading && (
            <div className="flex flex-col items-center py-12 gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">명함 인식 중...</p>
            </div>
          )}

          {preview && !uploading && extracted && (
            <>
              {/* Preview image */}
              <div className="rounded-xl overflow-hidden border border-border/60">
                <img src={preview} alt="명함" className="w-full h-40 object-contain bg-muted/30" />
              </div>

              {/* Extracted info */}
              <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm font-medium flex items-center gap-1.5 mb-3 text-emerald-700 dark:text-emerald-400">
                  <Check className="h-4 w-4" />
                  인식 완료 (신뢰도 {Math.round(extracted.confidence * 100)}%)
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{extracted.name}</span>
                    {extracted.role && (
                      <span className="text-muted-foreground">{extracted.role}</span>
                    )}
                  </div>
                  {extracted.company && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      {extracted.company}
                    </div>
                  )}
                  {extracted.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {extracted.phone}
                    </div>
                  )}
                  {extracted.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      {extracted.email}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {extracted && customerId && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/60 bg-muted/30">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              닫기
            </button>
            <button
              onClick={() => onCreated(customerId)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              고객 상세 보기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
