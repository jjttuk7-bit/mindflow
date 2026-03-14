import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SWRegister } from "@/components/sw-register";
import { PWAInstallPrompt } from "@/components/pwa-install";
import { FontSizeProvider } from "@/components/font-size-provider";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: {
    default: "DotLine — 기록은 내가, 정리는 AI가",
    template: "%s | DotLine",
  },
  description: "아이디어, 링크, 이미지, 음성 메모를 한곳에 담고 AI가 자동으로 정리합니다.",
  applicationName: "DotLine",
  keywords: ["AI", "지식 관리", "노트", "메모", "태깅", "knowledge management", "productivity"],
  authors: [{ name: "DotLine" }],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192", sizes: "192x192", type: "image/png" },
      { url: "/icon", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "DotLine",
    title: "DotLine — 기록은 내가, 정리는 AI가",
    description: "아이디어, 링크, 이미지, 음성 메모를 한곳에 담고 AI가 자동으로 정리합니다.",
  },
  twitter: {
    card: "summary_large_image",
    title: "DotLine — 기록은 내가, 정리는 AI가",
    description: "아이디어, 링크, 이미지, 음성 메모를 한곳에 담고 AI가 자동으로 정리합니다.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DotLine",
  },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning data-font-size="normal">
      <body
        className={`${dmSans.variable} ${dmSerif.variable} font-[family-name:var(--font-body)] antialiased`}
      >
        <ThemeProvider>
          <FontSizeProvider>
            {children}
          </FontSizeProvider>
          <Toaster position="top-center" richColors closeButton />
          <SWRegister />
          <PWAInstallPrompt />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
