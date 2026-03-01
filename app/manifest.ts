import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mindflow",
    short_name: "Mindflow",
    description: "AI-powered personal knowledge manager",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF6F1",
    theme_color: "#8B4F35",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  }
}
