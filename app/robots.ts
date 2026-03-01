import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/settings", "/insights", "/knowledge-map"],
      },
    ],
    sitemap: "https://mindflow-five-eta.vercel.app/sitemap.xml",
  }
}
