import { headers } from "next/headers";
import Image from "next/image";
import { Suspense } from "react";
import LoginForm from "./login-form";

export default async function LoginPage() {
  const requestHeaders = await headers();
  const initialWaitlistSuccess = requestHeaders.get("x-waitlist-success") === "1";

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-neutral-100 lg:block">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src="/videos/login_page.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
      </div>

      <div className="login-surface flex flex-col bg-[#fdfdfc] px-6 py-10 sm:px-12">
        <div>
          <Image
            src="/images/logo.svg"
            alt="NovaStage"
            width={110}
            height={45}
            priority
            className="h-auto w-27.5"
          />
        </div>

        <div className="flex flex-1 items-center justify-center py-12">
          <Suspense fallback={<div className="text-sm text-neutral-400">Loading...</div>}>
            <LoginForm initialWaitlistSuccess={initialWaitlistSuccess} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
