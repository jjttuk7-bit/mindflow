"use client"

import { Upload, X, Camera, Loader2 } from "lucide-react"

interface Props {
  selectedFile: File | null
  previewUrl: string | null
  isDragging: boolean
  isAnalyzing: boolean
  isSubmitting: boolean
  hasCamera: boolean
  showCamera: boolean
  content: string
  isFocused: boolean
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  fileInputRef: React.RefObject<HTMLInputElement | null>
  cameraInputRef: React.RefObject<HTMLInputElement | null>
  onFileSelect: (file: File) => void
  onBatchUpload: (files: File[]) => void
  onClearFile: () => void
  onTakePhoto: () => void
  onCapturePhoto: () => void
  onStopCamera: () => void
  onDrop: (e: React.DragEvent) => void
  setIsDragging: (v: boolean) => void
  setContent: (v: string) => void
  setIsFocused: (v: boolean) => void
}

export function ImageInput({
  selectedFile, previewUrl, isDragging, isAnalyzing, isSubmitting,
  hasCamera, showCamera, content, isFocused,
  videoRef, canvasRef, fileInputRef, cameraInputRef,
  onFileSelect, onBatchUpload, onClearFile, onTakePhoto, onCapturePhoto, onStopCamera,
  onDrop, setIsDragging, setContent, setIsFocused,
}: Props) {
  return (
    <div className="px-5 pt-4 pb-2 space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files
          if (files && files.length > 1) onBatchUpload(Array.from(files))
          else if (files?.[0]) onFileSelect(files[0])
          e.target.value = ""
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFileSelect(file)
          e.target.value = ""
        }}
      />
      <canvas ref={canvasRef} className="hidden" />

      {!selectedFile && !showCamera && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center h-32 rounded-lg border-2 border-dashed transition-all duration-200 ${
            isDragging ? "border-primary/50 bg-primary/5" : "border-border/50 hover:border-border/80"
          }`}
        >
          <div className="flex gap-3 mb-2">
            {hasCamera && (
              <button type="button" onClick={onTakePhoto} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                <Camera className="h-4 w-4" />촬영
              </button>
            )}
            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              <Upload className="h-4 w-4" />업로드
            </button>
          </div>
          <p className="text-xs text-muted-foreground/40">또는 여기에 이미지를 드래그하세요</p>
        </div>
      )}

      {showCamera && (
        <div className="space-y-2">
          <div className="relative rounded-lg overflow-hidden bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-48 object-cover" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onCapturePhoto} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <Camera className="h-4 w-4" />저장
            </button>
            <button type="button" onClick={onStopCamera} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
              <X className="h-4 w-4" />취소
            </button>
          </div>
        </div>
      )}

      {selectedFile && previewUrl && (
        <div className="relative">
          <img src={previewUrl} alt="Preview" className="w-full max-h-48 object-cover rounded-lg" />
          <button onClick={onClearFile} className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {isAnalyzing && (
        <div className="flex items-center gap-2 text-sm text-primary/70">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>AI가 스크린샷을 분석하고 있습니다...</span>
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={isAnalyzing ? "분석 중..." : "설명을 추가하세요..."}
        className="w-full min-h-[44px] resize-none bg-transparent text-ui-base leading-relaxed focus:outline-none placeholder:text-muted-foreground/40 placeholder:italic"
        disabled={isSubmitting}
      />
    </div>
  )
}
