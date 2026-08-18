import { requireAuth, getAuthenticatedProfile, isAdminRole } from "@/lib/auth/session";
import { signOut } from "@/app/auth/actions";
import Image from "next/image";
import Link from "next/link";
import { LogOut, ShieldCheck, Sparkles, Code2, Rocket } from "lucide-react";

export default async function DashboardPage() {
  const user = await requireAuth("/login");
  const session = await getAuthenticatedProfile();
  const isAdmin = isAdminRole(session?.roles) || isAdminRole(session?.profile?.role);
  const fullName = session?.profile?.full_name || user.email?.split("@")[0];

  return (
    <div className="min-h-screen bg-[#fcfcfb] text-neutral-900">
      {/* Top Header */}
      <header className="border-b border-neutral-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-10 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-6">
            <Image
              src="/images/logo.svg"
              alt="NovaStage"
              width={100}
              height={40}
              className="h-auto w-24"
            />
            {isAdmin && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1 text-xs font-medium text-white shadow-xs hover:bg-neutral-800 transition"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin Console
              </Link>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-neutral-900">{fullName}</p>
              <p className="text-[11px] text-neutral-500">{user.email}</p>
            </div>

            <form action={signOut}>
              <button
                type="submit"
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-xs transition hover:bg-neutral-50 hover:text-neutral-900"
              >
                <LogOut className="h-3.5 w-3.5 text-neutral-400" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-lg border border-neutral-200/80 bg-white p-8 shadow-xs sm:p-12">
          <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 mb-6">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            Approved Developer Account Active
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
            Welcome to NovaStage, {fullName}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-neutral-600">
            Your account is verified and ready. You now have full access to the development environment and platform APIs.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-900 text-white">
                <Code2 className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-neutral-900">Developer Sandbox</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Ready for staging environments, API keys, and workspace workflows.
              </p>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-900 text-white">
                <Rocket className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-neutral-900">Production Deployment</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Live deployment orchestration and team management.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
