/**
 * Client-side image compression using Canvas API.
 * Resizes large images and converts to JPEG for smaller file sizes.
 */
export async function compressImage(
  file: File,
  maxDimension = 1920,
  quality = 0.85,
): Promise<File> {
  // Skip small files, GIFs (lose animation), and SVGs
  if (file.size < 500 * 1024) return file
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file

  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img

      // Only resize if exceeds max dimension
      if (width <= maxDimension && height <= maxDimension && file.size < 1024 * 1024) {
        resolve(file)
        return
      }

      // Scale down preserving aspect ratio
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0, width, height)

      // Use JPEG for photos (smaller), keep PNG only if original is small PNG
      const outputType = file.type === "image/png" && file.size < 1024 * 1024
        ? "image/png"
        : "image/jpeg"

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // Compression didn't help, use original
            resolve(file)
            return
          }
          const ext = outputType === "image/jpeg" ? ".jpg" : ".png"
          const name = file.name.replace(/\.[^.]+$/, ext)
          const compressed = new File([blob], name, { type: outputType })
          console.log(
            `[DotLine] Image compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB (${Math.round((1 - compressed.size / file.size) * 100)}% reduced)`,
          )
          resolve(compressed)
        },
        outputType,
        quality,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file) // Fallback to original on error
    }

    img.src = url
  })
}
