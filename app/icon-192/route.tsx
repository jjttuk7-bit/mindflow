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
            alignItems: "center",
            gap: 0,
          }}
        >
          <div style={{ display: "flex", width: 14, height: 14, borderRadius: 7, background: "rgba(255,255,255,0.4)", marginRight: 9 }} />
          <div style={{ display: "flex", width: 22, height: 22, borderRadius: 11, background: "rgba(255,255,255,0.65)", marginRight: 9 }} />
          <div style={{ display: "flex", width: 32, height: 32, borderRadius: 16, background: "white", marginRight: -8 }} />
          <div style={{ display: "flex", width: 52, height: 15, borderRadius: 8, background: "white" }} />
        </div>
      </div>
    ),
    { width: 192, height: 192 }
  )
}
