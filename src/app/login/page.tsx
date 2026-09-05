import Image from "next/image";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile, isAdminRole, isProfileComplete } from "@/lib/auth/session";
import LoginForm from "./login-form";
import { PrivacyPolicyTrigger } from "@/components/privacy/privacy-policy-modal";
import { TermsOfServiceTrigger } from "@/components/terms/terms-of-service-modal";
import { ThemeToggle } from "@/lib/theme-context";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getAuthenticatedProfile();
  if (session?.user) {
    if (!isProfileComplete(session.profile)) {
      redirect("/onboarding");
    }

    const isAdmin =
      isAdminRole(session.roles) || isAdminRole(session.profile?.role);
    redirect(isAdmin ? "/admin" : "/dashboard");
  }

  return (
    <div className="grid min-h-screen bg-white dark:bg-[#0f141c] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-neutral-100 dark:bg-neutral-900 lg:block">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src="/videos/login_page.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
      </div>

      <div className="login-surface flex flex-col justify-between bg-[#fdfdfc] dark:bg-[#0f141c] px-4 py-6 sm:px-12 sm:py-10 min-h-screen">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image
              src="/images/logo.svg"
              alt="NovaStage"
              width={110}
              height={45}
              priority
              className="h-auto w-27.5 dark:brightness-0 dark:invert"
            />
          </div>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center py-12">
          <Suspense fallback={<div className="text-sm text-neutral-400 dark:text-neutral-500">Loading...</div>}>
            <LoginForm initialMode="login" />
          </Suspense>
        </div>

        <div className="flex items-center justify-center gap-3 text-xs pt-4">
          <span className="font-semibold text-neutral-900 dark:text-white">Beta v1.0.4</span>
          <span className="text-neutral-300 dark:text-neutral-600">&bull;</span>
          <TermsOfServiceTrigger />
          <span className="text-neutral-300 dark:text-neutral-600">&bull;</span>
          <PrivacyPolicyTrigger />
        </div>
      </div>
    </div>
  );
}
