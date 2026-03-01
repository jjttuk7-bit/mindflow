import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C4724A"/>
      <stop offset="100%" stop-color="#8B4F35"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="108" fill="url(#bg)"/>
  <path d="M 135 375 L 135 190 Q 135 145 165 145 Q 195 145 220 200 L 256 285 L 292 200 Q 317 145 347 145 Q 377 145 377 190 L 377 375" fill="none" stroke="white" stroke-width="38" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M 105 415 Q 180 450 256 415 Q 332 380 407 415" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="18" stroke-linecap="round"/>
</svg>`

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/svg+xml,${encodeURIComponent(svg)}`}
          width={180}
          height={180}
          alt="Mindflow"
        />
      </div>
    ),
    { ...size }
  )
}
