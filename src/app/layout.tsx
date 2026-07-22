import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "投程 · 投递有迹，前程可见",
  description: "记录求职投递、面试进度和每一个下一步。",
  applicationName: "投程",
};

export const viewport: Viewport = {
  themeColor: "#10231c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
