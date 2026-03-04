import { ImageResponse } from "next/og"

export const runtime = "edge"

/**
 * Monochrome badge icon for push notifications (Android notification bar).
 * 96x96, white on transparent — Android will mask it automatically.
 */
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
          background: "transparent",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span
            style={{
              color: "white",
              fontSize: 64,
              fontWeight: 900,
              fontFamily: "Georgia, serif",
              lineHeight: 0.85,
              letterSpacing: -2,
            }}
          >
            M
          </span>
          <div
            style={{
              display: "flex",
              width: 48,
              height: 3,
              marginTop: -5,
              borderRadius: 2,
              background: "rgba(255,255,255,0.7)",
            }}
          />
        </div>
      </div>
    ),
    { width: 96, height: 96 }
  )
}
