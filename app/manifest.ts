import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DotLine — AI 지식 관리",
    short_name: "DotLine",
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
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable",
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
    prefer_related_applications: false,
    shortcuts: [
      {
        name: "새 기록 추가",
        short_name: "추가",
        url: "/?action=compose",
        icons: [{ src: "/icon-192", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "AI 채팅",
        short_name: "채팅",
        url: "/?tab=chat",
        icons: [{ src: "/icon-192", sizes: "192x192", type: "image/png" }],
      },
    ],
    screenshots: [
      {
        src: "/screenshot-wide.png",
        sizes: "1280x800",
        type: "image/png",
        form_factor: "wide",
      },
      {
        src: "/screenshot-narrow.png",
        sizes: "1594x3102",
        type: "image/png",
        form_factor: "narrow",
      },
    ],
    share_target: {
      action: "/share-target",
      method: "GET",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    },
    id: "/",
    lang: "ko",
    dir: "ltr",
    launch_handler: {
      client_mode: "navigate-existing",
    },
  }
}
