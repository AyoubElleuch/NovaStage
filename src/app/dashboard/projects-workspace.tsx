"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import {
  ArrowUpRight,
  FolderPlus,
  GitBranch,
  Loader2,
  Plus,
  Users,
  X,
} from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import type { DashboardProjectsData } from "@/lib/dashboard-data";

export default function ProjectsWorkspace() {
  const pathname = usePathname();
  const { data } = useSWR<DashboardProjectsData>(
    "/api/dashboard/projects",
    fetcher<DashboardProjectsData>
  );
  const projects = data?.projects || [];
  const userName = data?.userName || "Developer";
  const [dialog, setDialog] = useState<"create" | "join" | null>(null);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setPendingSlug(null);
  }, [pathname]);

  const handleDialogSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setIsSubmitting(false);
  };

  const primaryButton =
    "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-neutral-700 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70";
  const secondaryButton =
    "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-700 shadow-sm transition-all duration-150 hover:border-neutral-300 hover:bg-neutral-50 active:scale-[0.98]";

  return (
    <div className="space-y-10">
      <header className="dash-enter flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
            Workspace
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
            Projects
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Turn your next website or app into a clear, collaborative plan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button type="button" onClick={() => setDialog("create")} className={primaryButton}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New project
          </button>
          <button type="button" onClick={() => setDialog("join")} className={secondaryButton}>
            <Users className="h-4 w-4" aria-hidden="true" />
            Join a project
          </button>
        </div>
      </header>

      <section
        aria-labelledby="project-list-title"
        className="dash-enter"
        style={{ "--dash-delay": "90ms" } as React.CSSProperties}
      >
        <div className="mb-4 flex items-end justify-between">
          <h2 id="project-list-title" className="text-sm font-semibold text-neutral-900">
            Recent projects
          </h2>
          <span className="text-xs text-neutral-400">
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </span>
        </div>

        {projects.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project, index) => {
              const href = `/dashboard/projects/${project.slug}`;
              const isPending = pendingSlug === project.slug;
              return (
                <Link
                  key={project.slug}
                  href={href}
                  onClick={() => {
                    if (pathname !== href) setPendingSlug(project.slug);
                  }}
                  aria-disabled={isPending}
                  style={{ "--dash-delay": `${150 + index * 70}ms` } as React.CSSProperties}
                  className={`dash-enter group relative flex cursor-pointer flex-col rounded-xl border bg-white p-5 transition-all duration-200 ${
                    isPending
                      ? "pointer-events-none border-neutral-200 opacity-70"
                      : "border-neutral-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-neutral-100 text-neutral-500 transition-colors duration-200 group-hover:bg-neutral-900 group-hover:text-white">
                      <GitBranch className="h-4 w-4" aria-hidden="true" />
                    </span>
                    {isPending ? (
                      <Loader2
                        className="h-4 w-4 animate-spin text-neutral-400"
                        aria-hidden="true"
                      />
                    ) : (
                      <ArrowUpRight
                        className="h-4 w-4 -translate-x-1 translate-y-1 text-neutral-300 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:text-neutral-900 group-hover:opacity-100"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <h3 className="mt-5 text-sm font-semibold tracking-tight text-neutral-900">
                    {project.name}
                  </h3>
                  <p className="mt-1 text-[13px] leading-5 text-neutral-500">
                    {project.description}
                  </p>
                  <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-3.5 text-xs text-neutral-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                      {project.members} {project.members === 1 ? "member" : "members"}
                    </span>
                    <span className="whitespace-nowrap">{project.updatedAt}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-neutral-100 text-neutral-500">
              <FolderPlus className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-sm font-semibold text-neutral-900">
              Your first project starts here
            </h3>
            <p className="mt-1.5 text-[13px] text-neutral-500">
              Set up a shared space for your website or app plan.
            </p>
            <button
              type="button"
              onClick={() => setDialog("create")}
              className={`${primaryButton} mt-6`}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create a project
            </button>
          </div>
        )}
      </section>

      {dialog && (
        <div
          className="dash-fade fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/30 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={() => {
            if (!isSubmitting) setDialog(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-dialog-title"
            className="dash-pop relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-7 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setDialog(null)}
              disabled={isSubmitting}
              aria-label="Close dialog"
              className="absolute top-5 right-5 grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            <span className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-100 text-neutral-600">
              {dialog === "create" ? (
                <FolderPlus className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Users className="h-5 w-5" aria-hidden="true" />
              )}
            </span>
            <h2
              id="project-dialog-title"
              className="mt-5 text-xl font-semibold tracking-tight text-neutral-900"
            >
              {dialog === "create" ? "Create a new project" : "Join a project"}
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-neutral-500">
              {dialog === "create"
                ? `Set up a workspace for ${userName}'s next big idea.`
                : "Enter the invite code your teammate sent you."}
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleDialogSubmit}>
              <div>
                <label
                  htmlFor="project-value"
                  className="mb-1.5 block cursor-pointer text-sm font-medium text-neutral-700"
                >
                  {dialog === "create" ? "Project name" : "Invite code"}
                </label>
                <input
                  id="project-value"
                  name="projectValue"
                  autoFocus
                  disabled={isSubmitting}
                  placeholder={dialog === "create" ? "e.g. storefront-redesign" : "e.g. NS-8K4Q"}
                  className="h-11 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 shadow-xs transition-colors duration-150 placeholder:text-neutral-400 hover:border-neutral-300 focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100 focus:outline-none disabled:opacity-50"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`${primaryButton} h-11 w-full`}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isSubmitting ? "Working…" : dialog === "create" ? "Continue" : "Join project"}
              </button>
            </form>

            <p className="mt-5 text-xs leading-5 text-neutral-400">
              Project creation and invites will be connected to your workspace in the next step.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
