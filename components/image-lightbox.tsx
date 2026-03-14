"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { X, RotateCw, ZoomIn, ZoomOut } from "lucide-react"

export function ImageLightbox({
  src,
  alt,
  open,
  onClose,
}: {
  src: string
  alt: string
  open: boolean
  onClose: () => void
}) {
  const [rotation, setRotation] = useState(0)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    if (!open) return
    // Reset on open
    setRotation(0)
    setZoom(1)
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
      if (e.key === "r" || e.key === "R") setRotation((r) => (r + 90) % 360)
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(z + 0.25, 3))
      if (e.key === "-") setZoom((z) => Math.max(z - 0.25, 0.5))
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Controls */}
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.max(z - 0.25, 0.5)) }}
          className="h-10 w-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.min(z + 0.25, 3)) }}
          className="h-10 w-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setRotation((r) => (r + 90) % 360) }}
          className="h-10 w-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          aria-label="Rotate"
        >
          <RotateCw className="h-4 w-4" />
        </button>
        <button
          onClick={onClose}
          className="h-10 w-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Keyboard hints */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 text-white/30 text-ui-sm">
        <span>R 회전</span>
        <span>+/- 확대/축소</span>
        <span>ESC 닫기</span>
      </div>

      <div
        className="relative max-w-[90vw] max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: `rotate(${rotation}deg) scale(${zoom})`,
          transition: "transform 0.3s ease",
        }}
      >
        <Image
          src={src}
          alt={alt}
          width={1200}
          height={900}
          sizes="90vw"
          className="max-w-[90vw] max-h-[85vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
          priority
        />
      </div>
    </div>
  )
}
