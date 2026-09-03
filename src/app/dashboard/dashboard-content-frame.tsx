"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import { useMobileNav } from "@/lib/mobile-nav-context";

export default function DashboardContentFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { toggle } = useMobileNav();
  const isProjectCanvas = pathname?.startsWith("/dashboard/projects/");

  if (isProjectCanvas) {
    return (
      <main className="relative min-w-0 flex-1 h-dvh overflow-hidden bg-[#f7f6f2] dark:bg-[#10151f]">
        {children}
      </main>
    );
  }

  const pageTitle =
    pathname === "/dashboard"
      ? "Projects"
      : pathname === "/dashboard/updates"
      ? "Updates"
      : pathname === "/dashboard/settings"
      ? "Settings"
      : "Workspace";

  return (
    <main className="min-w-0 flex-1 overflow-y-auto flex flex-col">
      {/* Mobile Top App Bar */}
      <header className="sticky top-0 z-20 flex min-h-16 w-full items-center justify-between border-b border-neutral-200/80 bg-white/95 px-4.5 py-3.5 backdrop-blur-md md:hidden dark:border-[#263143] dark:bg-[#151c27]/95">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            aria-label="Open navigation menu"
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-700 shadow-2xs hover:bg-neutral-100 hover:text-neutral-900 transition-colors dark:border-[#263143] dark:bg-[#1c2433] dark:text-neutral-200 dark:hover:bg-[#232e3f] dark:hover:text-white"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="block">
              <Image
                src="/images/logo.svg"
                alt="NovaStage"
                width={92}
                height={37}
                priority
                className="h-6 w-auto dark:brightness-0 dark:invert"
              />
            </Link>
            <span className="rounded-md border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600 dark:border-[#283548] dark:bg-[#1e2736] dark:text-neutral-300">
              Beta v1.0.0
            </span>
          </div>
        </div>
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider dark:text-neutral-400">
          {pageTitle}
        </span>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-10 sm:py-12 flex-1">
        {children}
      </div>
    </main>
  );
}
