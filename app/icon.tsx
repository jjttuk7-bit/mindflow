import { ImageResponse } from "next/og"

export const size = { width: 512, height: 512 }
export const contentType = "image/png"

export default function Icon() {
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
          borderRadius: 108,
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
              fontSize: 340,
              fontWeight: 900,
              fontFamily: "Georgia, serif",
              lineHeight: 0.85,
              letterSpacing: -10,
              marginTop: -15,
            }}
          >
            M
          </span>
          <div
            style={{
              display: "flex",
              width: 260,
              height: 14,
              marginTop: -30,
              borderRadius: 7,
              background: "rgba(255,255,255,0.2)",
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  )
}
