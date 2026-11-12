import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedProfile, isAdminRole, isProfileComplete } from "@/lib/auth/session";
import AuthPageShell from "./auth-page-shell";
import LoginForm from "./login-form";

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
    <AuthPageShell>
      <Suspense fallback={<div className="text-sm text-neutral-400 dark:text-neutral-500">Loading...</div>}>
        <LoginForm initialMode="login" />
      </Suspense>
    </AuthPageShell>
  );
}
