import type { Metadata, Viewport } from "next";
import "./globals.css";
import LoadingScreen from "./loading-screen";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import PlatformAnnouncementBanner from "@/components/announcements/platform-announcement-banner";
import { getActivePlatformAnnouncement } from "@/lib/announcements/server";

import { ThemeProvider } from "@/lib/theme-context";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0f141c" },
  ],
};

export const metadata: Metadata = {
  title: "NovaStage — Collaborative System Architecture & Stack Designer",
  description: "Design, configure, and collaborate on modern software architecture diagrams and infrastructure in real time.",
  icons: {
    icon: "/images/icon.svg",
    shortcut: "/images/icon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const activeAnnouncement = await getActivePlatformAnnouncement();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('novastage-theme');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', 'dark');
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.setAttribute('data-theme', 'light');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#fafafa] text-neutral-900 dark:bg-[#0f141c] dark:text-[#f1f5f9] antialiased transition-colors duration-200">
        <ThemeProvider>
          <PlatformAnnouncementBanner initialAnnouncement={activeAnnouncement} />
          <NotificationProvider>{children}</NotificationProvider>
          <LoadingScreen />
        </ThemeProvider>
      </body>
    </html>
  );
}
