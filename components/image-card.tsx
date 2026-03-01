"use client"

import { useState } from "react"
import Image from "next/image"
import dynamic from "next/dynamic"

const ImageLightbox = dynamic(() => import("@/components/image-lightbox").then(m => m.ImageLightbox), { ssr: false })

export function ImageCard({
  imageUrl,
  caption,
}: {
  imageUrl: string
  caption?: string
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false)

  return (
    <>
      <div className="space-y-2">
        <button
          onClick={() => setLightboxOpen(true)}
          className="block w-full rounded-lg overflow-hidden bg-muted/30 border border-border/30 hover:border-border/60 transition-all duration-200 cursor-zoom-in"
        >
          <Image
            src={imageUrl}
            alt={caption || "Uploaded image"}
            width={600}
            height={256}
            sizes="(max-width: 768px) 100vw, 600px"
            className="w-full max-h-64 object-cover"
          />
        </button>
        {caption && (
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words text-foreground/90">
            {caption}
          </p>
        )}
      </div>
      <ImageLightbox
        src={imageUrl}
        alt={caption || "Image"}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  )
}
