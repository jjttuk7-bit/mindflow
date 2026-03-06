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
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
          }}
        >
          <div style={{ display: "flex", width: 30, height: 30, borderRadius: 15, background: "rgba(255,255,255,0.4)", marginRight: 20 }} />
          <div style={{ display: "flex", width: 48, height: 48, borderRadius: 24, background: "rgba(255,255,255,0.65)", marginRight: 20 }} />
          <div style={{ display: "flex", width: 68, height: 68, borderRadius: 34, background: "white", marginRight: -16 }} />
          <div style={{ display: "flex", width: 112, height: 32, borderRadius: 16, background: "white" }} />
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  )
}
