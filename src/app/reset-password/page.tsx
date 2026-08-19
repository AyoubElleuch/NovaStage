import Image from "next/image";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import ResetPasswordForm from "./reset-password-form";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?error=auth_callback_failed");
  }

  return (
    <main className="login-surface flex min-h-screen w-full flex-col items-center justify-center bg-[#fdfdfc] px-6 py-12 selection:bg-neutral-200 selection:text-neutral-900">
      <div className="mb-8 flex justify-center">
        <Image
          src="/images/logo.svg"
          alt="NovaStage"
          width={110}
          height={45}
          priority
          className="h-auto w-27.5"
        />
      </div>

      <Suspense fallback={<div className="text-sm text-neutral-400">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
