import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mindflow — AI 지식 관리",
    short_name: "Mindflow",
    description: "기록은 내가, 정리는 AI가. 아이디어, 링크, 이미지, 음성 메모를 한곳에 담고 AI가 자동으로 정리합니다.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#FAF6F1",
    theme_color: "#8B4F35",
    categories: ["productivity", "utilities"],
    icons: [
      {
        src: "/icon-192",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    screenshots: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        form_factor: "wide",
        label: "Mindflow Dashboard",
      },
    ],
  }
}
