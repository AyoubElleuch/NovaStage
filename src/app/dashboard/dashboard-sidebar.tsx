"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  ChevronDown,
  FolderGit2,
  Loader2,
  LogOut,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  Sun,
  Moon,
  X,
} from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { fetcher } from "@/lib/fetcher";
import type { DashboardProjectsData, DashboardSettingsData } from "@/lib/dashboard-data";
import UserAvatar from "@/components/ui/user-avatar";
import useSWR from "swr";
import { PrivacyPolicyTrigger } from "@/components/privacy/privacy-policy-modal";
import { TermsOfServiceTrigger } from "@/components/terms/terms-of-service-modal";
import { useMobileNav } from "@/lib/mobile-nav-context";
import { useTheme } from "@/lib/theme-context";

interface DashboardSidebarProps {
  userEmail: string | undefined;
  userRole: string;
}

const navigation = [
  { href: "/dashboard", label: "Projects", icon: FolderGit2 },
  { href: "/dashboard/updates", label: "Updates", icon: Megaphone },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function ThemeToggleButton({ collapsed }: { collapsed: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={collapsed ? (isDark ? "Switch to light mode" : "Switch to dark mode") : undefined}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-[#1e2736] dark:hover:text-white ${
        collapsed ? "justify-center px-0" : ""
      }`}
    >
      {isDark ? (
        <Sun className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
      )}
      {!collapsed && (
        <div className="flex w-full items-center justify-between">
          <span className="truncate">{isDark ? "Light mode" : "Dark mode"}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            {isDark ? "Dark" : "Light"}
          </span>
        </div>
      )}
    </button>
  );
}

function SignOutButton({ collapsed }: { collapsed: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      title={collapsed ? "Sign out" : undefined}
      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-[#1e2736] dark:hover:text-white disabled:cursor-wait disabled:opacity-60 ${
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

export default function DashboardSidebar({ userEmail, userRole }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { data } = useSWR<DashboardProjectsData>(
    "/api/dashboard/projects",
    fetcher<DashboardProjectsData>
  );
  const { data: settingsData } = useSWR<DashboardSettingsData>(
    "/api/dashboard/settings",
    fetcher<DashboardSettingsData>
  );
  const projects = data?.projects || [];
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { isOpen: isMobileOpen, setIsOpen: setIsMobileOpen } = useMobileNav();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(
    pathname === "/dashboard" || pathname.startsWith("/dashboard/projects/")
  );
  const isAdmin = userRole === "admin" || userRole === "super_admin";
  const collapsed = isMobile ? false : isCollapsed;
  const activePendingHref = pendingHref !== pathname ? pendingHref : null;

  const [prevPathname, setPrevPathname] = useState(pathname);

  // If route changed during render, clear any pending indicator
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setPendingHref(null);
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const update = () => {
      setIsMobile(mediaQuery.matches);
      if (mediaQuery.matches) {
        setIsMobileOpen(false);
      }
    };
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, [setIsMobileOpen]);

  useEffect(() => {
    if (!isMobile) {
      document.documentElement.style.setProperty(
        "--sidebar-width",
        collapsed ? "68px" : "240px"
      );
    } else {
      document.documentElement.style.removeProperty("--sidebar-width");
    }
    return () => {
      document.documentElement.style.removeProperty("--sidebar-width");
    };
  }, [collapsed, isMobile]);

  const navigate = (href: string) => {
    if (isMobile) setIsMobileOpen(false);
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
      ? "bg-neutral-100 text-neutral-900 dark:bg-[#1e2736] dark:text-white"
      : "text-neutral-500 hover:bg-neutral-100/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-[#1e2736]/70 dark:hover:text-white";

  return (
    <>
    {isMobile && isMobileOpen && (
      <div
      className="fixed inset-x-0 bottom-0 top-(--announcement-height) z-40 bg-neutral-950/40 backdrop-blur-xs md:hidden dark:bg-black/60"
        onClick={() => setIsMobileOpen(false)}
        aria-hidden="true"
      />
    )}
    <aside
      className={`fixed bottom-0 left-0 top-(--announcement-height) z-50 flex min-h-0 h-[calc(100dvh-var(--announcement-height))] shrink-0 flex-col border-r border-neutral-200 bg-white shadow-[8px_0_30px_rgba(0,0,0,0.06)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:relative md:top-0 md:z-30 md:h-full md:shadow-none dark:border-[#263143] dark:bg-[#151c27] ${
        isMobile
          ? `w-72 max-w-[85vw] ${isMobileOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"}`
          : collapsed
          ? "w-17"
          : "w-60"
      }`}
    >
      <div
        className={`flex items-center border-b border-neutral-100 dark:border-[#263143] py-5 ${
          collapsed && !isMobile ? "justify-center px-0" : "justify-between px-5"
        }`}
      >
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            aria-label="NovaStage dashboard"
            onClick={() => navigate("/dashboard")}
            className="block cursor-pointer"
          >
            {collapsed && !isMobile ? (
              <span className="flex h-8 w-8 overflow-hidden rounded-lg bg-white dark:bg-[#151c27]">
                <Image
                  src="/images/logo.svg"
                  alt="NovaStage"
                  width={171}
                  height={70}
                  priority
                  className="h-8 w-auto max-w-none shrink-0 dark:brightness-0 dark:invert"
                />
              </span>
            ) : (
              <Image
                src="/images/logo.svg"
                alt="NovaStage"
                width={104}
                height={42}
                priority
                className="h-auto w-[104px] dark:brightness-0 dark:invert"
              />
            )}
          </Link>
          {(!collapsed || isMobile) && (
            <span className="rounded-md border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600 dark:border-[#283548] dark:bg-[#1e2736] dark:text-neutral-300">
              Beta v1.0.4
            </span>
          )}
        </div>

        {isMobile && (
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close navigation"
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 transition-colors dark:hover:bg-[#1e2736] dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav aria-label="User navigation" className="flex flex-1 flex-col space-y-0.5 overflow-y-auto px-3 py-4">
        <div>
          {!collapsed && (
            <p className="px-2.5 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400 dark:text-neutral-500">
              Workspace
            </p>
          )}

          {navigation.map(({ href, label, icon: Icon }) => {
            const isProjectsRoute =
              pathname === "/dashboard" || pathname.startsWith("/dashboard/projects/");
            const isActive = href === "/dashboard" ? isProjectsRoute : pathname.startsWith(href);
            const isPending = activePendingHref === href;

            if (href === "/dashboard") {
              return (
                <div key={href}>
                  <Link
                    href={href}
                    title={collapsed ? label : undefined}
                    onClick={() => {
                      navigate(href);
                      setIsProjectsExpanded((expanded) =>
                        pathname === "/dashboard" ? !expanded : true
                      );
                    }}
                    className={`${linkBase} ${linkTone(isActive)} ${collapsed ? "justify-center px-0" : ""}`}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
                    ) : (
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    )}
                    {!collapsed && projects.length > 0 && (
                      <>
                        <span className="truncate">{label}</span>
                        <ChevronDown
                          aria-hidden="true"
                          className={`ml-auto h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform duration-200 ${
                            isProjectsExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </>
                    )}
                    {!collapsed && projects.length === 0 && (
                      <span className="truncate">{label}</span>
                    )}
                  </Link>

                  {isProjectsExpanded && !collapsed && projects.length > 0 && (
                    <div className="mt-0.5 ml-[19px] space-y-0.5 border-l border-neutral-200 dark:border-[#283548] pl-3">
                      {projects.map((project) => {
                        const projectHref = `/dashboard/projects/${project.slug}`;
                        const projectActive = pathname === projectHref;
                        return (
                          <Link
                            key={project.slug}
                            href={projectHref}
                            onClick={() => navigate(projectHref)}
                            className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors duration-150 ${
                              projectActive
                                ? "font-medium text-neutral-900 dark:text-white"
                                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                            }`}
                          >
                            <span className="truncate">{project.name}</span>
                            {activePendingHref === projectHref && (
                              <Loader2
                                className="ml-auto h-3 w-3 shrink-0 animate-spin text-neutral-400"
                                aria-hidden="true"
                              />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

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

          {isAdmin && (
            <>
              {!collapsed && (
                <p className="px-2.5 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400 dark:text-neutral-500">
                  Administration
                </p>
              )}
              <Link
                href="/admin"
                title={collapsed ? "Admin Console" : undefined}
                onClick={() => navigate("/admin")}
                className={`${linkBase} ${linkTone(false)} ${collapsed ? "justify-center px-0" : ""}`}
              >
                {activePendingHref === "/admin" ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                {!collapsed && <span className="truncate">Admin Console</span>}
              </Link>
            </>
          )}
        </div>

        <div className="mt-auto pt-4 space-y-1">
          <TermsOfServiceTrigger variant="sidebar-button" collapsed={collapsed} />
          <PrivacyPolicyTrigger variant="sidebar-button" collapsed={collapsed} />
        </div>
      </nav>

      {/* Light / Dark Mode Toggle with full-width top border */}
      <div className="border-t border-neutral-100 dark:border-[#263143] p-3">
        <ThemeToggleButton collapsed={collapsed} />
      </div>

      {/* User Account & Sign Out with full-width separator border */}
      <div className="border-t border-neutral-100 dark:border-[#263143] p-3 space-y-1.5">
        <div
          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 ${
            collapsed ? "justify-center px-0" : ""
          }`}
        >
          <UserAvatar
            src={settingsData?.profile?.avatar_url}
            name={settingsData?.profile?.full_name}
            email={userEmail}
            size="md"
          />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-neutral-900 dark:text-white">{userEmail}</p>
              <p className="text-[11px] capitalize text-neutral-400 dark:text-neutral-500">
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
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute top-1/2 -right-3.5 z-20 hidden h-7 w-7 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-neutral-200/90 bg-white text-neutral-600 shadow-md transition-all hover:bg-neutral-900 hover:text-white dark:border-[#283548] dark:bg-[#1a2230] dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-200 dark:focus-visible:ring-neutral-700 md:grid"
      >
        {collapsed ? (
          <PanelLeftOpen className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <PanelLeftClose className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>
    </aside>
    </>
  );
}
