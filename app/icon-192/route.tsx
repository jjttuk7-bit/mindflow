import { ImageResponse } from "next/og"

export const runtime = "edge"

export async function GET() {
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
          borderRadius: 40,
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
              fontSize: 128,
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
              width: 96,
              height: 5,
              marginTop: -10,
              borderRadius: 3,
              background: "rgba(255,255,255,0.2)",
            }}
          />
        </div>
      </div>
    ),
    { width: 192, height: 192 }
  )
}
