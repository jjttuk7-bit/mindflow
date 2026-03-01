import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { SWRegister } from "@/components/sw-register";
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
  title: "Mindflow — 기록은 내가, 정리는 AI가",
  description: "아이디어, 링크, 이미지, 음성 메모를 한곳에 담고 AI가 자동으로 정리합니다.",
  applicationName: "Mindflow",
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
        </ThemeProvider>
      </body>
    </html>
  );
}
