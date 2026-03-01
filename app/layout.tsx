import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { SWRegister } from "@/components/sw-register";
import { PWAInstallPrompt } from "@/components/pwa-install";
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
    default: "Mindflow — 기록은 내가, 정리는 AI가",
    template: "%s | Mindflow",
  },
  description: "아이디어, 링크, 이미지, 음성 메모를 한곳에 담고 AI가 자동으로 정리합니다.",
  applicationName: "Mindflow",
  keywords: ["AI", "지식 관리", "노트", "메모", "태깅", "knowledge management", "productivity"],
  authors: [{ name: "Mindflow" }],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "Mindflow",
    title: "Mindflow — 기록은 내가, 정리는 AI가",
    description: "아이디어, 링크, 이미지, 음성 메모를 한곳에 담고 AI가 자동으로 정리합니다.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mindflow — 기록은 내가, 정리는 AI가",
    description: "아이디어, 링크, 이미지, 음성 메모를 한곳에 담고 AI가 자동으로 정리합니다.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mindflow",
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
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${dmSerif.variable} font-[family-name:var(--font-body)] antialiased`}
      >
        <ThemeProvider>
          {children}
          <Toaster position="top-center" richColors closeButton />
          <SWRegister />
          <PWAInstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
