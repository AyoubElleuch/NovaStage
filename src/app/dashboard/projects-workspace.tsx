"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  FolderPlus,
  GitBranch,
  Loader2,
  LogOut,
  MoreVertical,
  Plus,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
  UserX,
  X,
} from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { createClient } from "@/lib/supabase/client";
import { useNotifications } from "@/components/notifications/notification-provider";
import type {
  DashboardProject,
  DashboardProjectsData,
  ProjectMemberInfo,
  ProjectJoinRequestInfo,
  ProjectBannedMemberInfo,
} from "@/lib/dashboard-data";

export default function ProjectsWorkspace() {
  const pathname = usePathname();
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { notify } = useNotifications();

  const { data } = useSWR<DashboardProjectsData>(
    "/api/dashboard/projects",
    fetcher<DashboardProjectsData>
  );
  const projects = data?.projects || [];
  const userName = data?.userName || "Developer";

  // Modals & Menu State
  const [activeModal, setActiveModal] = useState<
    "create" | "join" | "members" | "leave" | "delete" | null
  >(null);
  const [selectedProject, setSelectedProject] = useState<DashboardProject | null>(null);
  const [menuOpenProjectId, setMenuOpenProjectId] = useState<string | null>(null);

  // Form & Action States
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [joinPendingProject, setJoinPendingProject] = useState<DashboardProject | null>(null);

  // Members Modal & Kick State
  const [memberTab, setMemberTab] = useState<"members" | "requests" | "banned">("members");
  const [projectMembers, setProjectMembers] = useState<ProjectMemberInfo[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [projectRequests, setProjectRequests] = useState<ProjectJoinRequestInfo[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [projectBanned, setProjectBanned] = useState<ProjectBannedMemberInfo[]>([]);
  const [isLoadingBanned, setIsLoadingBanned] = useState(false);
  const [confirmKickTarget, setConfirmKickTarget] = useState<ProjectMemberInfo | null>(null);
  const [isKickingMember, setIsKickingMember] = useState(false);
  const [resolvingRequestId, setResolvingRequestId] = useState<string | null>(null);
  const [unbanningUserId, setUnbanningUserId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const activePendingSlug = pendingSlug && !pathname.includes(pendingSlug) ? pendingSlug : null;

  // Close three-dots dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenProjectId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch members, requests, and banned lists when members modal opens
  const openMembersModal = async (
    project: DashboardProject,
    initialTab: "members" | "requests" | "banned" = "members"
  ) => {
    setSelectedProject(project);
    setActiveModal("members");
    setMemberTab(initialTab);
    setMenuOpenProjectId(null);
    setConfirmKickTarget(null);
    setIsLoadingMembers(true);
    setIsLoadingRequests(true);
    setIsLoadingBanned(true);

    try {
      const res = await fetch(`/api/dashboard/projects/members?projectId=${project.id}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setProjectMembers(json.members || []);
      } else {
        setProjectMembers([]);
        notify({
          tone: "error",
          title: "Could not load members",
          message: json.error || "Failed to retrieve project collaborators.",
        });
      }
    } catch {
      setProjectMembers([]);
    } finally {
      setIsLoadingMembers(false);
    }

    if (project.role === "owner") {
      try {
        const [reqRes, banRes] = await Promise.all([
          fetch(`/api/dashboard/projects/requests?projectId=${project.id}`),
          fetch(`/api/dashboard/projects/banned?projectId=${project.id}`),
        ]);
        const reqJson = await reqRes.json();
        const banJson = await banRes.json();
        if (reqRes.ok && reqJson.success) setProjectRequests(reqJson.requests || []);
        if (banRes.ok && banJson.success) setProjectBanned(banJson.bannedMembers || []);
      } catch (err) {
        console.warn("Failed to load requests/banned:", err);
      } finally {
        setIsLoadingRequests(false);
        setIsLoadingBanned(false);
      }
    }
  };

  const handleResolveRequest = async (requestId: string, action: "approve" | "decline") => {
    if (!selectedProject || resolvingRequestId) return;
    setResolvingRequestId(requestId);

    try {
      const res = await fetch("/api/dashboard/projects/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          projectId: selectedProject.id,
          action,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        notify({
          tone: "error",
          title: "Action failed",
          message: json.error || "Failed to update join request.",
        });
        return;
      }

      setProjectRequests((prev) => prev.filter((r) => r.id !== requestId));
      await mutate("/api/dashboard/projects");

      // Refresh members list
      const memRes = await fetch(`/api/dashboard/projects/members?projectId=${selectedProject.id}`);
      const memJson = await memRes.json();
      if (memRes.ok && memJson.success) {
        setProjectMembers(memJson.members || []);
      }

      notify({
        title: action === "approve" ? "Collaborator approved" : "Request declined",
        message:
          action === "approve"
            ? "New collaborator has been added to the project."
            : "Join request has been declined.",
      });
    } catch (err) {
      console.error("Resolve request error:", err);
      notify({ tone: "error", title: "Network error", message: "Please try again." });
    } finally {
      setResolvingRequestId(null);
    }
  };

  const handleUnbanUser = async (targetUserId: string) => {
    if (!selectedProject || unbanningUserId) return;
    setUnbanningUserId(targetUserId);

    try {
      const res = await fetch("/api/dashboard/projects/banned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject.id,
          targetUserId,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        notify({
          tone: "error",
          title: "Could not unblock user",
          message: json.error || "Failed to unblock collaborator.",
        });
        return;
      }

      setProjectBanned((prev) => prev.filter((b) => b.userId !== targetUserId));
      notify({
        title: "Collaborator unblocked",
        message: "They can now request to join this project again.",
      });
    } catch (err) {
      console.error("Unban error:", err);
      notify({ tone: "error", title: "Network error", message: "Please try again." });
    } finally {
      setUnbanningUserId(null);
    }
  };

  const handleCopyCode = async (event: React.MouseEvent, code: string) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      notify({
        title: "Invite code copied",
        message: `Share code ${code} with your teammates so they can join.`,
        copyText: code,
      });
      window.setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      notify({
        tone: "error",
        title: "Could not copy",
        message: "Please manually copy the code.",
      });
    }
  };

  const handleCreateProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const trimmed = projectName.trim();
    if (!trimmed) {
      notify({
        tone: "error",
        title: "Project name required",
        message: "Please give your project a name to continue.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/dashboard/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          description: projectDescription.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        notify({
          tone: "error",
          title: "Failed to create project",
          message: json.error || "An error occurred while creating the project.",
        });
        setIsSubmitting(false);
        return;
      }

      await mutate("/api/dashboard/projects");

      notify({
        title: "Project created",
        message: `"${json.project.name}" has been created with invite code ${json.project.inviteCode}.`,
        copyText: json.project.inviteCode,
      });

      setActiveModal(null);
      setProjectName("");
      setProjectDescription("");
      setIsSubmitting(false);

      if (json.project?.slug) {
        router.push(`/dashboard/projects/${json.project.slug}`);
      }
    } catch (err) {
      console.error("Create project error:", err);
      notify({
        tone: "error",
        title: "Network error",
        message: "Unable to reach the server. Please try again.",
      });
      setIsSubmitting(false);
    }
  };

  const handleJoinProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const trimmed = inviteCode.trim().toUpperCase();
    if (!trimmed) {
      notify({
        tone: "error",
        title: "Invite code required",
        message: "Enter the invite code you received (e.g. NS-8A3F1).",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/dashboard/projects/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: trimmed }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        notify({
          tone: "error",
          title: "Could not join project",
          message: json.error || "Please verify the invite code and try again.",
        });
        setIsSubmitting(false);
        return;
      }

      await mutate("/api/dashboard/projects");

      if (json.pendingApproval) {
        setJoinPendingProject(json.project);
        setIsSubmitting(false);
        notify({
          title: "Join request sent",
          message: `Your request to join "${json.project.name}" has been sent to the owner for approval.`,
        });
        return;
      }

      notify({
        title: "Joined project",
        message: `You are now a collaborator on "${json.project.name}".`,
      });

      setActiveModal(null);
      setInviteCode("");
      setIsSubmitting(false);

      if (json.project?.slug) {
        router.push(`/dashboard/projects/${json.project.slug}`);
      }
    } catch (err) {
      console.error("Join project error:", err);
      notify({
        tone: "error",
        title: "Network error",
        message: "Unable to reach the server. Please try again.",
      });
      setIsSubmitting(false);
    }
  };

  const handleLeaveProject = async () => {
    if (!selectedProject || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/dashboard/projects/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject.id }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        notify({
          tone: "error",
          title: "Could not leave project",
          message: json.error || "Failed to leave the project.",
        });
        setIsSubmitting(false);
        return;
      }

      await mutate("/api/dashboard/projects");

      notify({
        title: "Left project",
        message: `You are no longer a collaborator on "${selectedProject.name}".`,
      });

      setActiveModal(null);
      setSelectedProject(null);
      setIsSubmitting(false);
    } catch (err) {
      console.error("Leave project error:", err);
      notify({
        tone: "error",
        title: "Network error",
        message: "Unable to leave project. Please try again.",
      });
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/dashboard/projects/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject.id }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        notify({
          tone: "error",
          title: "Could not delete project",
          message: json.error || "Failed to delete the project.",
        });
        setIsSubmitting(false);
        return;
      }

      await mutate("/api/dashboard/projects");

      notify({
        title: "Project deleted",
        message: `"${selectedProject.name}" has been permanently removed.`,
      });

      setActiveModal(null);
      setSelectedProject(null);
      setIsSubmitting(false);
    } catch (err) {
      console.error("Delete project error:", err);
      notify({
        tone: "error",
        title: "Network error",
        message: "Unable to delete project. Please try again.",
      });
      setIsSubmitting(false);
    }
  };

  const handleConfirmKickMember = async () => {
    if (!selectedProject || !confirmKickTarget || isKickingMember) return;
    setIsKickingMember(true);

    const memberId = confirmKickTarget.userId;
    const memberName =
      confirmKickTarget.fullName || confirmKickTarget.email?.split("@")[0] || "Collaborator";

    try {
      const res = await fetch("/api/dashboard/projects/kick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject.id,
          memberId,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        notify({
          tone: "error",
          title: "Could not remove member",
          message: json.error || "Failed to remove collaborator.",
        });
        setIsKickingMember(false);
        return;
      }

      setProjectMembers((current) => current.filter((m) => m.userId !== memberId));
      if (confirmKickTarget) {
        setProjectBanned((prev) => [
          {
            id: memberId,
            projectId: selectedProject.id,
            userId: memberId,
            fullName: confirmKickTarget.fullName,
            email: confirmKickTarget.email,
            username: confirmKickTarget.username,
            avatarUrl: confirmKickTarget.avatarUrl,
            bannedAt: "Removed just now",
          },
          ...prev,
        ]);
      }
      await mutate("/api/dashboard/projects");

      // Broadcast eviction event to kick them out in real time if they have the canvas open
      try {
        const supabase = createClient();
        const kickChannel = supabase.channel(`project-canvas:${selectedProject.id}`, {
          config: { broadcast: { ack: true } },
        });
        kickChannel.subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            try {
              await kickChannel.send({
                type: "broadcast",
                event: "member:kicked",
                payload: { userId: memberId, projectId: selectedProject.id },
              });
            } catch (err) {
              console.warn("Error sending member:kicked event:", err);
            } finally {
              window.setTimeout(() => {
                supabase.removeChannel(kickChannel);
              }, 3000);
            }
          }
        });
      } catch (broadcastErr) {
        console.warn("Failed to broadcast member:kicked event:", broadcastErr);
      }

      notify({
        title: "Collaborator removed & blocked",
        message: `${memberName} has been removed from "${selectedProject.name}" and blocked from rejoining with the invite code.`,
      });

      // Animate back to the members list view smoothly
      setConfirmKickTarget(null);
    } catch (err) {
      console.error("Kick member error:", err);
      notify({
        tone: "error",
        title: "Network error",
        message: "Failed to remove collaborator. Please try again.",
      });
    } finally {
      setIsKickingMember(false);
    }
  };

  const primaryButton =
    "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-neutral-700 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70";
  const secondaryButton =
    "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-700 shadow-sm transition-all duration-150 hover:border-neutral-300 hover:bg-neutral-50 active:scale-[0.98]";
  const dangerButton =
    "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-rose-700 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70";

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
          <button
            type="button"
            onClick={() => {
              setProjectName("");
              setProjectDescription("");
              setActiveModal("create");
            }}
            className={primaryButton}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New project
          </button>
          <button
            type="button"
            onClick={() => {
              setInviteCode("");
              setActiveModal("join");
            }}
            className={secondaryButton}
          >
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
            Your projects
          </h2>
          <span className="text-xs text-neutral-400">
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </span>
        </div>

        {projects.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project, index) => {
              const href = `/dashboard/projects/${project.slug}`;
              const isPending = activePendingSlug === project.slug;
              const isOwner = project.role === "owner";
              const isCopied = copiedCode === project.inviteCode;
              const isMenuOpen = menuOpenProjectId === project.id;

              return (
                <div
                  key={project.id || project.slug}
                  style={{ "--dash-delay": `${150 + index * 70}ms` } as React.CSSProperties}
                  className="dash-enter relative"
                >
                  <Link
                    href={href}
                    onClick={() => {
                      if (pathname !== href) setPendingSlug(project.slug);
                    }}
                    aria-disabled={isPending}
                    className={`group relative flex cursor-pointer flex-col rounded-xl border bg-white p-5 transition-all duration-200 ${
                      isPending
                        ? "pointer-events-none border-neutral-200 opacity-70"
                        : "border-neutral-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-500 transition-colors duration-200 group-hover:bg-neutral-900 group-hover:text-white">
                        <GitBranch className="h-4 w-4" aria-hidden="true" />
                      </span>

                      <div className="flex items-center gap-1.5">
                        {/* Pending Join Requests Indicator Badge for Project Owner */}
                        {isOwner && (project.pendingRequestsCount || 0) > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openMembersModal(project, "requests");
                            }}
                            title={`${project.pendingRequestsCount} pending join request${project.pendingRequestsCount === 1 ? "" : "s"}`}
                            aria-label={`View ${project.pendingRequestsCount} pending join requests`}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-neutral-900 px-2.5 py-0.5 text-[11px] font-medium text-white shadow-2xs transition-all hover:bg-neutral-800 hover:scale-105 active:scale-95"
                          >
                            <span className="relative flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                            </span>
                            <span>
                              {project.pendingRequestsCount} {project.pendingRequestsCount === 1 ? "request" : "requests"}
                            </span>
                          </button>
                        )}

                        {project.role && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              isOwner
                                ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                                : "bg-neutral-100 text-neutral-600 border border-neutral-200/60"
                            }`}
                          >
                            {isOwner && <Crown className="h-3 w-3" aria-hidden="true" />}
                            {isOwner ? "Owner" : "Collaborator"}
                          </span>
                        )}

                        {/* Three-dots menu button */}
                        <div className="relative" ref={isMenuOpen ? menuRef : undefined}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setMenuOpenProjectId(isMenuOpen ? null : project.id);
                            }}
                            title="More options"
                            aria-label="Project actions menu"
                            className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                          >
                            <MoreVertical className="h-4 w-4" aria-hidden="true" />
                          </button>

                          {/* Dropdown Menu */}
                          {isMenuOpen && (
                            <div
                              role="menu"
                              aria-orientation="vertical"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              className="dash-pop absolute right-0 top-8 z-30 w-48 rounded-xl border border-neutral-200 bg-white py-1.5 shadow-xl"
                            >
                              {isOwner ? (
                                <>
                                  {(project.pendingRequestsCount || 0) > 0 && (
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => openMembersModal(project, "requests")}
                                      className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-xs font-semibold text-neutral-900 transition-colors hover:bg-neutral-50"
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <Clock className="h-3.5 w-3.5 text-neutral-600" aria-hidden="true" />
                                        <span>Review requests</span>
                                      </div>
                                      <span className="grid h-4.5 min-w-4.5 place-items-center rounded-full bg-neutral-900 px-1 text-[10px] font-bold text-white">
                                        {project.pendingRequestsCount}
                                      </span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => openMembersModal(project, "members")}
                                    className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
                                  >
                                    <Users className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
                                    <span>See all members</span>
                                  </button>
                                  <div className="my-1 border-t border-neutral-100" />
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      setSelectedProject(project);
                                      setActiveModal("delete");
                                      setMenuOpenProjectId(null);
                                    }}
                                    className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
                                    <span>Delete project</span>
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setSelectedProject(project);
                                    setActiveModal("leave");
                                    setMenuOpenProjectId(null);
                                  }}
                                  className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50"
                                >
                                  <LogOut className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
                                  <span>Leave project</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>

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
                    </div>

                    <h3 className="mt-4 text-sm font-semibold tracking-tight text-neutral-900 truncate">
                      {project.name}
                    </h3>

                    <p className="mt-1 text-[13px] leading-5 text-neutral-500 line-clamp-2 min-h-[40px]">
                      {project.description || "No description provided."}
                    </p>

                    {project.inviteCode && (
                      <div className="mt-3 flex items-center justify-between rounded-lg bg-neutral-50 px-2.5 py-1.5 text-xs text-neutral-500 border border-neutral-100">
                        <span className="text-[11px] font-mono tracking-wider font-medium text-neutral-700">
                          {project.inviteCode}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyCode(e, project.inviteCode!)}
                          title="Copy invite code to share"
                          className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
                        >
                          {isCopied ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                              <span className="text-emerald-600">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" aria-hidden="true" />
                              <span>Share</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs text-neutral-400">
                      <span className="inline-flex items-center gap-1.5 text-neutral-500">
                        <Users className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
                        <span>
                          {project.members}/5 members
                          {project.members >= 5 && (
                            <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                              (Full)
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="whitespace-nowrap">{project.updatedAt}</span>
                    </div>
                  </Link>
                </div>
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
              Set up a shared workspace for your app plan or join an existing team.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setProjectName("");
                  setProjectDescription("");
                  setActiveModal("create");
                }}
                className={primaryButton}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create a project
              </button>
              <button
                type="button"
                onClick={() => {
                  setInviteCode("");
                  setActiveModal("join");
                }}
                className={secondaryButton}
              >
                <Users className="h-4 w-4" aria-hidden="true" />
                Join with invite code
              </button>
            </div>
          </div>
        )}
      </section>

      {/* CREATE & JOIN MODAL */}
      {(activeModal === "create" || activeModal === "join") && (
        <div
          className="dash-fade fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/30 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={() => {
            if (!isSubmitting) setActiveModal(null);
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
              onClick={() => setActiveModal(null)}
              disabled={isSubmitting}
              aria-label="Close dialog"
              className="absolute top-5 right-5 grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            <span className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-100 text-neutral-600">
              {activeModal === "create" ? (
                <FolderPlus className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Users className="h-5 w-5" aria-hidden="true" />
              )}
            </span>
            <h2
              id="project-dialog-title"
              className="mt-5 text-xl font-semibold tracking-tight text-neutral-900"
            >
              {activeModal === "create" ? "Create a new project" : "Join a project"}
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-neutral-500">
              {activeModal === "create"
                ? `Set up a workspace for ${userName}'s next big idea.`
                : "Enter the invite code your teammate shared with you."}
            </p>

            {activeModal === "create" ? (
              <form className="mt-6 space-y-4" onSubmit={handleCreateProject}>
                <div>
                  <label
                    htmlFor="project-name"
                    className="mb-1.5 block cursor-pointer text-sm font-medium text-neutral-700"
                  >
                    Project name
                  </label>
                  <input
                    id="project-name"
                    name="projectName"
                    autoFocus
                    required
                    maxLength={80}
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="e.g. Storefront Redesign"
                    className="h-11 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 shadow-xs transition-colors duration-150 placeholder:text-neutral-400 hover:border-neutral-300 focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100 focus:outline-none disabled:opacity-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="project-description"
                    className="mb-1.5 block cursor-pointer text-sm font-medium text-neutral-700"
                  >
                    Description <span className="text-neutral-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    id="project-description"
                    name="projectDescription"
                    rows={3}
                    maxLength={250}
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Short summary of the product or service architecture..."
                    className="w-full rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-900 shadow-xs transition-colors duration-150 placeholder:text-neutral-400 hover:border-neutral-300 focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100 focus:outline-none disabled:opacity-50 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !projectName.trim()}
                  className={`${primaryButton} h-11 w-full`}
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {isSubmitting ? "Creating project…" : "Create project"}
                </button>
              </form>
            ) : joinPendingProject ? (
              <div className="mt-6 space-y-5 dash-fade">
                <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-5 text-center shadow-xs">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white border border-neutral-200/80 text-neutral-800 shadow-2xs">
                    <Clock className="h-5 w-5 text-neutral-700" aria-hidden="true" />
                  </div>
                  <h3 className="mt-3.5 text-sm font-semibold text-neutral-900">
                    Request Sent — Waiting for Owner Approval
                  </h3>
                  <p className="mt-1.5 text-xs text-neutral-500 leading-relaxed max-w-xs mx-auto">
                    Your request to join <span className="font-semibold text-neutral-800">{joinPendingProject.name}</span> has been submitted to the project owner. You will gain access as soon as they accept.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    setJoinPendingProject(null);
                    setInviteCode("");
                  }}
                  className={`${primaryButton} h-11 w-full`}
                >
                  Understood
                </button>
              </div>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={handleJoinProject}>
                <div>
                  <label
                    htmlFor="invite-code"
                    className="mb-1.5 block cursor-pointer text-sm font-medium text-neutral-700"
                  >
                    Invite code
                  </label>
                  <input
                    id="invite-code"
                    name="inviteCode"
                    autoFocus
                    required
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    disabled={isSubmitting}
                    placeholder="e.g. NS-8A3F1"
                    className="h-11 w-full font-mono uppercase tracking-wider rounded-lg border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 shadow-xs transition-colors duration-150 placeholder:text-neutral-400 hover:border-neutral-300 focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100 focus:outline-none disabled:opacity-50"
                  />
                  <p className="mt-1.5 text-xs text-neutral-400">
                    Invite codes begin with <span className="font-mono font-medium">NS-</span> followed by 5 characters.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !inviteCode.trim()}
                  className={`${primaryButton} h-11 w-full`}
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {isSubmitting ? "Sending request…" : "Request to join"}
                </button>
              </form>
            )}

            <p className="mt-5 text-xs leading-5 text-neutral-400">
              {activeModal === "create"
                ? "You will be set as the project owner with a unique invite code to share with collaborators."
                : "Entering the invite code submits a join request to the project owner for approval."}
            </p>
          </div>
        </div>
      )}

      {/* SEE ALL MEMBERS & CONFIRM REMOVAL MODAL (Single Animated Modal) */}
      {activeModal === "members" && selectedProject && (
        <div
          className="dash-fade fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/30 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={() => {
            if (!isKickingMember) {
              setActiveModal(null);
              setConfirmKickTarget(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="members-dialog-title"
            className="dash-pop relative w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-7 shadow-2xl transition-all duration-300"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setActiveModal(null);
                setConfirmKickTarget(null);
              }}
              aria-label="Close dialog"
              className="absolute top-5 right-5 grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            {/* VIEW A: CONFIRM REMOVAL VIEW (Within the same modal) */}
            {confirmKickTarget ? (
              <div className="dash-fade space-y-5">
                {/* Back to list button on top left */}
                <button
                  type="button"
                  onClick={() => setConfirmKickTarget(null)}
                  disabled={isKickingMember}
                  className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors disabled:opacity-50"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Back to all members</span>
                </button>

                <div className="flex items-start gap-3.5 pt-1">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                    <UserMinus className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2
                      id="members-dialog-title"
                      className="text-lg font-semibold tracking-tight text-neutral-900"
                    >
                      Remove {confirmKickTarget.fullName || confirmKickTarget.email?.split("@")[0] || "collaborator"}?
                    </h2>
                    <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                      Are you sure you want to remove this collaborator from <span className="font-medium text-neutral-800">{selectedProject.name}</span>? They will immediately lose access and be <span className="font-semibold text-rose-700">blocked from rejoining with the invite code</span>.
                    </p>
                  </div>
                </div>

                {/* Target Collaborator Summary Card */}
                <div className="flex items-center justify-between rounded-xl border border-neutral-200/80 bg-neutral-50/80 p-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-neutral-900 text-xs font-semibold text-white uppercase">
                      {(confirmKickTarget.fullName || confirmKickTarget.email || "C")[0]}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-neutral-900 truncate">
                        {confirmKickTarget.fullName || confirmKickTarget.email?.split("@")[0] || "Collaborator"}
                      </p>
                      <p className="text-[11px] text-neutral-500 truncate">
                        {confirmKickTarget.email || (confirmKickTarget.username ? `@${confirmKickTarget.username}` : "")}
                      </p>
                    </div>
                  </div>
                  {confirmKickTarget.joinedAt && (
                    <span className="text-[11px] text-neutral-400 shrink-0">
                      {confirmKickTarget.joinedAt}
                    </span>
                  )}
                </div>

                <div className="pt-3 border-t border-neutral-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                  <button
                    type="button"
                    disabled={isKickingMember}
                    onClick={() => setConfirmKickTarget(null)}
                    className={`${secondaryButton} h-9 text-xs px-4`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isKickingMember}
                    onClick={handleConfirmKickMember}
                    className={`${dangerButton} h-9 text-xs px-4 whitespace-nowrap`}
                  >
                    {isKickingMember && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                    {isKickingMember ? "Removing & blocking…" : "Confirm removal"}
                  </button>
                </div>
              </div>
            ) : (
              /* VIEW B: ALL COLLABORATORS & REQUESTS VIEW */
              <div className="dash-fade space-y-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-100 text-neutral-700">
                    <Users className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2
                      id="members-dialog-title"
                      className="text-xl font-semibold tracking-tight text-neutral-900"
                    >
                      Project Collaborators
                    </h2>
                    <p className="text-xs text-neutral-500">
                      {selectedProject.name}
                    </p>
                  </div>
                </div>

                {/* Owner Sub-Tabs for Members, Requests, Blocked */}
                {selectedProject.role === "owner" && (
                  <div className="flex items-center gap-1.5 border-b border-neutral-100 pb-3">
                    <button
                      type="button"
                      onClick={() => setMemberTab("members")}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        memberTab === "members"
                          ? "bg-neutral-900 text-white shadow-2xs"
                          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                      }`}
                    >
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Members ({projectMembers.length}/5)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMemberTab("requests")}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        memberTab === "requests"
                          ? "bg-neutral-900 text-white shadow-2xs"
                          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Requests</span>
                      {projectRequests.length > 0 && (
                        <span
                          className={`grid h-4.5 min-w-4.5 place-items-center rounded-full px-1 text-[10px] font-bold ${
                            memberTab === "requests"
                              ? "bg-white text-neutral-950"
                              : "bg-neutral-200 text-neutral-800"
                          }`}
                        >
                          {projectRequests.length}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setMemberTab("banned")}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        memberTab === "banned"
                          ? "bg-neutral-900 text-white shadow-2xs"
                          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                      }`}
                    >
                      <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Blocked ({projectBanned.length})</span>
                    </button>
                  </div>
                )}

                {/* TAB 1: MEMBERS */}
                {memberTab === "members" && (
                  <div className="space-y-4">
                    {/* Invite code banner inside members modal */}
                    {selectedProject.inviteCode && (
                      <div className="flex items-center justify-between rounded-xl border border-neutral-200/80 bg-neutral-50 p-3.5">
                        <div>
                          <p className="text-xs font-medium text-neutral-700">Invite new teammate</p>
                          <p className="font-mono text-xs font-semibold tracking-wider text-neutral-900 mt-0.5">
                            {selectedProject.inviteCode}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleCopyCode(e, selectedProject.inviteCode!)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 shadow-2xs transition-colors hover:bg-neutral-50"
                        >
                          {copiedCode === selectedProject.inviteCode ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                              <span className="text-emerald-600">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
                              <span>Copy code</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Members List */}
                    <div>
                      <div className="mb-2.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-neutral-400">
                        <span>Members ({projectMembers.length}/5)</span>
                        <span>Role</span>
                      </div>

                      {isLoadingMembers ? (
                        <div className="space-y-2 py-4">
                          {[1, 2].map((i) => (
                            <div key={i} className="flex items-center justify-between rounded-lg p-2.5 animate-pulse bg-neutral-50">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-neutral-200" />
                                <div className="space-y-1.5">
                                  <div className="h-3 w-28 rounded bg-neutral-200" />
                                  <div className="h-2.5 w-20 rounded bg-neutral-200" />
                                </div>
                              </div>
                              <div className="h-6 w-16 rounded-full bg-neutral-200" />
                            </div>
                          ))}
                        </div>
                      ) : projectMembers.length > 0 ? (
                        <div className="max-h-64 overflow-y-auto space-y-1 divide-y divide-neutral-100 pr-1">
                          {projectMembers.map((member) => {
                            const isMemberOwner = member.role === "owner";
                            const displayName = member.fullName || member.email?.split("@")[0] || "User";
                            const displaySub = member.email || (member.username ? `@${member.username}` : "");

                            return (
                              <div
                                key={member.userId}
                                className="flex items-center justify-between py-2.5 px-1.5 transition-colors hover:bg-neutral-50/80 rounded-lg"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-neutral-900 text-xs font-semibold text-white uppercase">
                                    {displayName[0]}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-neutral-900 truncate">
                                      {displayName}
                                    </p>
                                    <p className="text-xs text-neutral-400 truncate">
                                      {displaySub} {member.joinedAt ? `• ${member.joinedAt}` : ""}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                      isMemberOwner
                                        ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                                        : "bg-neutral-100 text-neutral-600 border border-neutral-200/60"
                                    }`}
                                  >
                                    {isMemberOwner && <Crown className="h-3 w-3" aria-hidden="true" />}
                                    {isMemberOwner ? "Owner" : "Collaborator"}
                                  </span>

                                  {/* Kick collaborator button */}
                                  {selectedProject.role === "owner" && !isMemberOwner && (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmKickTarget(member)}
                                      title={`Remove and block ${displayName}`}
                                      aria-label={`Remove ${displayName}`}
                                      className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-neutral-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                                    >
                                      <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="py-6 text-center text-xs text-neutral-400">
                          No members found.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: JOIN REQUESTS */}
                {memberTab === "requests" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-neutral-400">
                      <span>Pending Join Requests ({projectRequests.length})</span>
                      <span>Action</span>
                    </div>

                    {/* Capacity limit warning banner if project full */}
                    {projectMembers.length >= 5 && (
                      <div className="flex items-center gap-2.5 rounded-xl border border-neutral-200/80 bg-neutral-50/80 p-3 text-xs text-neutral-600">
                        <ShieldAlert className="h-4 w-4 shrink-0 text-neutral-700" aria-hidden="true" />
                        <p>
                          <span className="font-semibold text-neutral-900">Project capacity reached (5/5 members).</span> Remove an existing member before accepting new requests.
                        </p>
                      </div>
                    )}

                    {isLoadingRequests ? (
                      <div className="space-y-2 py-4">
                        {[1, 2].map((i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg p-2.5 animate-pulse bg-neutral-50">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-neutral-200" />
                              <div className="space-y-1.5">
                                <div className="h-3 w-28 rounded bg-neutral-200" />
                                <div className="h-2.5 w-20 rounded bg-neutral-200" />
                              </div>
                            </div>
                            <div className="h-7 w-24 rounded bg-neutral-200" />
                          </div>
                        ))}
                      </div>
                    ) : projectRequests.length > 0 ? (
                      <div className="max-h-64 overflow-y-auto space-y-2 divide-y divide-neutral-100 pr-1">
                        {projectRequests.map((req) => {
                          const displayName = req.fullName || req.email?.split("@")[0] || "User";
                          const displaySub = req.email || (req.username ? `@${req.username}` : "");
                          const isBusy = resolvingRequestId === req.id;
                          const isProjectFull = projectMembers.length >= 5;

                          return (
                            <div
                              key={req.id}
                              className="flex items-center justify-between py-2.5 px-1.5 transition-colors hover:bg-neutral-50/80 rounded-lg"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-neutral-900 text-xs font-semibold text-white uppercase">
                                  {displayName[0]}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-neutral-900 truncate">
                                    {displayName}
                                  </p>
                                  <p className="text-xs text-neutral-400 truncate">
                                    {displaySub} {req.createdAt ? `• ${req.createdAt}` : ""}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  disabled={isBusy || isProjectFull}
                                  onClick={() => handleResolveRequest(req.id, "approve")}
                                  title={isProjectFull ? "Project is at maximum capacity (5/5 members)" : "Approve join request"}
                                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-2xs transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  {isBusy ? (
                                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                                  ) : (
                                    <UserCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                                  )}
                                  <span>Approve</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleResolveRequest(req.id, "decline")}
                                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-600 shadow-2xs transition-colors hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 disabled:opacity-50"
                                >
                                  <UserX className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>Decline</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <CheckCircle2 className="mx-auto h-7 w-7 text-neutral-300" aria-hidden="true" />
                        <p className="mt-2 text-xs font-medium text-neutral-600">No pending join requests</p>
                        <p className="text-[11px] text-neutral-400">When someone uses your invite code, their request will appear here.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: BLOCKED / REMOVED */}
                {memberTab === "banned" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-neutral-400">
                      <span>Blocked Collaborators ({projectBanned.length})</span>
                      <span>Action</span>
                    </div>

                    {isLoadingBanned ? (
                      <div className="space-y-2 py-4">
                        {[1, 2].map((i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg p-2.5 animate-pulse bg-neutral-50">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-neutral-200" />
                              <div className="space-y-1.5">
                                <div className="h-3 w-28 rounded bg-neutral-200" />
                                <div className="h-2.5 w-20 rounded bg-neutral-200" />
                              </div>
                            </div>
                            <div className="h-7 w-20 rounded bg-neutral-200" />
                          </div>
                        ))}
                      </div>
                    ) : projectBanned.length > 0 ? (
                      <div className="max-h-64 overflow-y-auto space-y-2 divide-y divide-neutral-100 pr-1">
                        {projectBanned.map((banned) => {
                          const displayName = banned.fullName || banned.email?.split("@")[0] || "User";
                          const displaySub = banned.email || (banned.username ? `@${banned.username}` : "");
                          const isBusy = unbanningUserId === banned.userId;

                          return (
                            <div
                              key={banned.id}
                              className="flex items-center justify-between py-2.5 px-1.5 transition-colors hover:bg-neutral-50/80 rounded-lg"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-neutral-900 text-xs font-semibold text-white uppercase">
                                  {displayName[0]}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-neutral-900 truncate">
                                    {displayName}
                                  </p>
                                  <p className="text-xs text-neutral-400 truncate">
                                    {displaySub} {banned.bannedAt ? `• ${banned.bannedAt}` : ""}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleUnbanUser(banned.userId)}
                                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 shadow-2xs transition-colors hover:bg-neutral-50 disabled:opacity-50"
                                >
                                  {isBusy ? (
                                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
                                  )}
                                  <span>Unblock</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <ShieldAlert className="mx-auto h-7 w-7 text-neutral-300" aria-hidden="true" />
                        <p className="mt-2 text-xs font-medium text-neutral-600">No blocked collaborators</p>
                        <p className="text-[11px] text-neutral-400">Collaborators you remove from this project will appear here.</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t border-neutral-100 pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className={`${secondaryButton} h-9 text-xs px-4`}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LEAVE PROJECT CONFIRMATION MODAL */}
      {activeModal === "leave" && selectedProject && (
        <div
          className="dash-fade fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/30 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={() => {
            if (!isSubmitting) setActiveModal(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-dialog-title"
            className="dash-pop relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-7 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              disabled={isSubmitting}
              aria-label="Close dialog"
              className="absolute top-5 right-5 grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            <span className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-100 text-neutral-700">
              <LogOut className="h-5 w-5" aria-hidden="true" />
            </span>

            <h2
              id="leave-dialog-title"
              className="mt-5 text-xl font-semibold tracking-tight text-neutral-900"
            >
              Leave {selectedProject.name}?
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Are you sure you want to leave this project? You will no longer have access to the planning canvas unless you are invited back.
            </p>

            <div className="mt-7 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                disabled={isSubmitting}
                className={secondaryButton}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLeaveProject}
                disabled={isSubmitting}
                className={primaryButton}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isSubmitting ? "Leaving…" : "Leave project"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE PROJECT CONFIRMATION MODAL */}
      {activeModal === "delete" && selectedProject && (
        <div
          className="dash-fade fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/30 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={() => {
            if (!isSubmitting) setActiveModal(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            className="dash-pop relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-7 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              disabled={isSubmitting}
              aria-label="Close dialog"
              className="absolute top-5 right-5 grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <Trash2 className="h-5 w-5" aria-hidden="true" />
            </span>

            <h2
              id="delete-dialog-title"
              className="mt-5 text-xl font-semibold tracking-tight text-neutral-900"
            >
              Delete {selectedProject.name}?
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              This will permanently remove this project and revoke access for all collaborators. This action cannot be undone.
            </p>

            <div className="mt-7 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                disabled={isSubmitting}
                className={secondaryButton}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProject}
                disabled={isSubmitting}
                className={dangerButton}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isSubmitting ? "Deleting…" : "Delete project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
