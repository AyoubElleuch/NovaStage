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
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { fetcher } from "@/lib/fetcher";
import type { DashboardProjectsData } from "@/lib/dashboard-data";
import useSWR from "swr";

interface DashboardSidebarProps {
  userEmail: string | undefined;
  userRole: string;
}

const navigation = [
  { href: "/dashboard", label: "Projects", icon: FolderGit2 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
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

export default function DashboardSidebar({ userEmail, userRole }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { data } = useSWR<DashboardProjectsData>(
    "/api/dashboard/projects",
    fetcher<DashboardProjectsData>
  );
  const projects = data?.projects || [];
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(
    pathname === "/dashboard" || pathname.startsWith("/dashboard/projects/")
  );
  const isAdmin = userRole === "admin" || userRole === "super_admin";
  const collapsed = isCollapsed || isMobile;
  const activePendingHref = pendingHref !== pathname ? pendingHref : null;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  const navigate = (href: string) => {
    if (href !== pathname) setPendingHref(href);
  };

  const linkBase =
    "group flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors duration-150";
  const linkTone = (active: boolean) =>
    active
      ? "bg-neutral-100 text-neutral-900"
      : "text-neutral-500 hover:bg-neutral-100/70 hover:text-neutral-900";

  return (
    <aside
      className={`relative flex h-dvh shrink-0 flex-col border-r border-neutral-200 bg-white transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        collapsed ? "w-[68px]" : "w-60"
      }`}
    >
      <div
        className={`flex items-center border-b border-neutral-100 py-5 ${
          collapsed ? "justify-center px-0" : "px-5"
        }`}
      >
        <Link
          href="/dashboard"
          aria-label="NovaStage dashboard"
          onClick={() => navigate("/dashboard")}
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

      <nav aria-label="User navigation" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {!collapsed && (
          <p className="px-2.5 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
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
                  <div className="mt-0.5 ml-[19px] space-y-0.5 border-l border-neutral-200 pl-3">
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
                              ? "font-medium text-neutral-900"
                              : "text-neutral-500 hover:text-neutral-900"
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
              <p className="px-2.5 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
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
      </nav>

      <div className="border-t border-neutral-100 p-3">
        <div
          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 ${
            collapsed ? "justify-center px-0" : ""
          }`}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
            {(userEmail?.[0] || "N").toUpperCase()}
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
        className="absolute top-1/2 -right-3 hidden h-6 w-6 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-neutral-200 bg-white text-neutral-500 shadow-sm transition-colors hover:bg-neutral-900 hover:text-white md:grid"
      >
        {isCollapsed ? (
          <PanelLeftOpen className="h-3 w-3" aria-hidden="true" />
        ) : (
          <PanelLeftClose className="h-3 w-3" aria-hidden="true" />
        )}
      </button>
    </aside>
  );
}
