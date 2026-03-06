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
            alignItems: "center",
            justifyContent: "center",
            gap: 0,
          }}
        >
          {/* Small dot */}
          <div style={{ display: "flex", width: 42, height: 42, borderRadius: 21, background: "rgba(255,255,255,0.4)", marginRight: 20 }} />
          {/* Medium dot */}
          <div style={{ display: "flex", width: 70, height: 70, borderRadius: 35, background: "rgba(255,255,255,0.65)", marginRight: 18 }} />
          {/* Large dot merging into line */}
          <div style={{ display: "flex", width: 96, height: 96, borderRadius: 48, background: "white", marginRight: -24 }} />
          {/* Line extending from large dot */}
          <div style={{ display: "flex", width: 110, height: 44, borderRadius: 22, background: "white" }} />
        </div>
      </div>
    ),
    { ...size }
  )
}
