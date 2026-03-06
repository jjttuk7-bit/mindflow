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
            alignItems: "center",
            gap: 0,
          }}
        >
          <div style={{ display: "flex", width: 13, height: 13, borderRadius: 7, background: "rgba(255,255,255,0.4)", marginRight: 8 }} />
          <div style={{ display: "flex", width: 21, height: 21, borderRadius: 11, background: "rgba(255,255,255,0.65)", marginRight: 8 }} />
          <div style={{ display: "flex", width: 30, height: 30, borderRadius: 15, background: "white", marginRight: -7 }} />
          <div style={{ display: "flex", width: 50, height: 14, borderRadius: 7, background: "white" }} />
        </div>
      </div>
    ),
    { ...size }
  )
}
