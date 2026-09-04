"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Menu, ShieldCheck } from "lucide-react";
import { useMobileNav } from "@/lib/mobile-nav-context";

export default function AdminContentFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { toggle } = useMobileNav();

  const pageTitle =
    pathname === "/admin"
      ? "Overview"
      : pathname === "/admin/waitlist"
      ? "Waitlist"
      : pathname === "/admin/ai-limits"
      ? "AI Limits"
      : "Admin Console";

  return (
    <main className="min-w-0 flex-1 overflow-y-auto flex flex-col">
      {/* Mobile Admin App Bar */}
      <header className="sticky top-0 z-20 flex min-h-16 w-full items-center justify-between border-b border-neutral-200/80 bg-white/95 px-4.5 py-3.5 backdrop-blur-md md:hidden dark:border-[#283548] dark:bg-[#161d27]/95">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            aria-label="Open admin navigation"
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-700 shadow-2xs hover:bg-neutral-100 hover:text-neutral-900 transition-colors dark:border-[#283548] dark:bg-[#1e2634] dark:text-neutral-200 dark:hover:bg-[#283548]"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="block">
              <Image
                src="/images/logo.svg"
                alt="NovaStage"
                width={92}
                height={37}
                priority
                className="h-6 w-auto dark:brightness-0 dark:invert"
              />
            </Link>
            <span className="rounded-md border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600 dark:border-[#283548] dark:bg-[#1e2634] dark:text-neutral-300">
              Beta v1.0.3
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-neutral-900 px-2.5 py-0.5 text-[11px] font-medium text-white dark:bg-[#1e2634] dark:text-neutral-200">
          <ShieldCheck className="h-3 w-3 text-amber-400" />
          <span>{pageTitle}</span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-10 sm:py-12 flex-1">
        {children}
      </div>
    </main>
  );
}
