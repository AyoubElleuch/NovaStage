"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  FolderGit2,
  LayoutGrid,
  Loader2,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { PrivacyPolicyTrigger } from "@/components/privacy/privacy-policy-modal";

interface AdminSidebarProps {
  userEmail: string | undefined;
  userRole: string;
}

const navigation = [
  { href: "/admin", label: "Overview", icon: LayoutGrid },
  { href: "/admin/waitlist", label: "Waitlist", icon: UsersRound },
  { href: "/admin/ai-limits", label: "AI Limits", icon: Sparkles },
];


function SignOutButton({ collapsed }: { collapsed: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      title={collapsed ? "Sign out" : undefined}
      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-wait disabled:opacity-60 ${
        collapsed ? "justify-center px-0" : ""
      }`}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      {!collapsed && (
        <span className="truncate">{pending ? "Signing out…" : "Sign out"}</span>
      )}
    </button>
  );
}

export default function AdminSidebar({ userEmail, userRole }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const collapsed = isCollapsed || isMobile;
  const activePendingHref = pendingHref !== pathname ? pendingHref : null;

  const [prevPathname, setPrevPathname] = useState(pathname);

  // If route changed during render, clear any pending indicator
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setPendingHref(null);
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  const navigate = (href: string) => {
    if (href !== pathname) {
      setPendingHref(href);
      setTimeout(() => {
        setPendingHref((current) => (current === href ? null : current));
      }, 2500);
    }
  };

  const linkBase =
    "group flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors duration-150";
  const linkTone = (active: boolean) =>
    active
      ? "bg-neutral-100 text-neutral-900"
      : "text-neutral-500 hover:bg-neutral-100/70 hover:text-neutral-900";

  return (
    <aside
      className={`relative z-30 flex h-dvh shrink-0 flex-col border-r border-neutral-200 bg-white transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        collapsed ? "w-[68px]" : "w-60"
      }`}
    >
      <div
        className={`flex items-center border-b border-neutral-100 py-5 ${
          collapsed ? "justify-center px-0" : "px-5"
        }`}
      >
        <Link
          href="/admin"
          aria-label="NovaStage admin overview"
          onClick={() => navigate("/admin")}
          className="block cursor-pointer"
        >
          {collapsed ? (
            <span className="flex h-8 w-8 overflow-hidden rounded-lg bg-white">
              <Image
                src="/images/logo.svg"
                alt="NovaStage"
                width={171}
                height={70}
                priority
                className="h-8 w-auto max-w-none shrink-0"
              />
            </span>
          ) : (
            <Image
              src="/images/logo.svg"
              alt="NovaStage"
              width={104}
              height={42}
              priority
              className="h-auto w-[104px]"
            />
          )}
        </Link>
      </div>

      <nav aria-label="Admin navigation" className="flex flex-1 flex-col space-y-0.5 overflow-y-auto px-3 py-4">
        <div>
          {!collapsed && (
            <p className="px-2.5 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
              Administration
            </p>
          )}

          {navigation.map(({ href, label, icon: Icon }) => {
            const isActive = href === "/admin" ? pathname === href : pathname.startsWith(href);
            const isPending = activePendingHref === href;

            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                onClick={() => navigate(href)}
                className={`${linkBase} ${linkTone(isActive)} ${collapsed ? "justify-center px-0" : ""}`}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
                ) : (
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}

          {!collapsed && (
            <p className="px-2.5 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
              Workspace
            </p>
          )}
          <Link
            href="/dashboard"
            title={collapsed ? "Back to Workspace" : undefined}
            onClick={() => navigate("/dashboard")}
            className={`${linkBase} ${linkTone(false)} ${collapsed ? "justify-center px-0" : ""}`}
          >
            {activePendingHref === "/dashboard" ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
            ) : (
              <FolderGit2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            {!collapsed && <span className="truncate">Back to Workspace</span>}
          </Link>
        </div>

        <div className="mt-auto pt-4">
          <PrivacyPolicyTrigger variant="sidebar-button" collapsed={collapsed} />
        </div>
      </nav>

      <div className="border-t border-neutral-100 p-3">
        <div
          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 ${
            collapsed ? "justify-center px-0" : ""
          }`}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
            {(userEmail?.[0] || "A").toUpperCase()}
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-neutral-900">{userEmail}</p>
              <p className="text-[11px] capitalize text-neutral-400">
                {userRole.replace("_", " ")}
              </p>
            </div>
          )}
        </div>
        <form action={signOut}>
          <SignOutButton collapsed={collapsed} />
        </form>
      </div>

      <button
        type="button"
        onClick={() => setIsCollapsed((value) => !value)}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute top-1/2 -right-3.5 z-20 hidden h-7 w-7 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-neutral-200/90 bg-white text-neutral-600 shadow-md transition-all hover:bg-neutral-900 hover:text-white md:grid"
      >
        {isCollapsed ? (
          <PanelLeftOpen className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <PanelLeftClose className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>
    </aside>
  );
}