import type { Metadata, Viewport } from "next";
import "./globals.css";
import LoadingScreen from "./loading-screen";
import { NotificationProvider } from "@/components/notifications/notification-provider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#080b11",
};

export const metadata: Metadata = {
  title: "NovaStage — Collaborative System Architecture & Stack Designer",
  description: "Design, configure, and collaborate on modern software architecture diagrams and infrastructure in real time.",
  icons: {
    icon: "/images/icon.svg",
    shortcut: "/images/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#080b11] text-slate-100 antialiased">
        <NotificationProvider>{children}</NotificationProvider>
        <LoadingScreen />
      </body>
    </html>
  );
}
