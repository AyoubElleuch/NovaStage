import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { PrivacyPolicyTrigger } from "@/components/privacy/privacy-policy-modal";
import { TermsOfServiceTrigger } from "@/components/terms/terms-of-service-modal";
import { ThemeToggle } from "@/lib/theme-context";
import { APP_RELEASE } from "@/lib/release";

/** Shared two-column authentication shell with top-level navigation back to the interactive demo. */
export default function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-white dark:bg-[#0f141c] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-neutral-100 dark:bg-neutral-900 lg:block">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src="/videos/login_page.mp4"
          preload="metadata"
          autoPlay
          loop
          muted
          playsInline
        />
      </div>

      <div className="login-surface flex flex-col justify-between bg-[#fdfdfc] dark:bg-[#0f141c] px-4 py-6 sm:px-12 sm:py-10 min-h-screen">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            aria-label="NovaStage home"
            className="inline-flex items-center rounded-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-100"
          >
            <Image
              src="/images/logo.svg"
              alt="NovaStage"
              width={110}
              height={45}
              priority
              className="h-auto w-27.5 dark:brightness-0 dark:invert"
            />
          </Link>
          <div className="flex items-center gap-2.5">
            <Link
              href="/#live-canvas"
              className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-700 shadow-2xs transition-colors hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900 dark:border-[#283548] dark:bg-[#161d27] dark:text-neutral-200 dark:hover:border-[#384961] dark:hover:bg-[#1e2634] dark:hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-100"
            >
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Interactive Demo</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center py-12">
          {children}
        </div>

        <div className="flex items-center justify-center gap-3 text-xs pt-4">
          <span className="font-semibold text-neutral-900 dark:text-white">{APP_RELEASE}</span>
          <span className="text-neutral-300 dark:text-neutral-600">&bull;</span>
          <TermsOfServiceTrigger />
          <span className="text-neutral-300 dark:text-neutral-600">&bull;</span>
          <PrivacyPolicyTrigger />
        </div>
      </div>
    </div>
  );
}
