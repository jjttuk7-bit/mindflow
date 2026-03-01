import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

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
          background: "linear-gradient(135deg, #C4724A, #8B4F35)",
          borderRadius: 38,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0,
          }}
        >
          <span
            style={{
              color: "white",
              fontSize: 120,
              fontWeight: 900,
              fontFamily: "Georgia, serif",
              lineHeight: 0.85,
              letterSpacing: -4,
              marginTop: -5,
            }}
          >
            M
          </span>
          <div
            style={{
              display: "flex",
              width: 90,
              height: 5,
              marginTop: -10,
              borderRadius: 3,
              background: "rgba(255,255,255,0.2)",
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  )
}
