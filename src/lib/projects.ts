import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeRedisGet, safeRedisSet, safeRedisDel } from "@/lib/redis/client";
import type {
  DashboardProject,
  ProjectMemberInfo,
  ProjectJoinRequestInfo,
  ProjectBannedMemberInfo,
} from "@/lib/dashboard-data";

/**
 * Maximum number of members allowed in a project: 1 owner + 4 collaborators = 5 total.
 */
export const MAX_PROJECT_MEMBERS = 5;

/**
 * Resolves maximum project member limit based on user subscription plan.
 * - Free: 5 members
 * - Plus: 10 members (2x)
 * - Pro: 25 members (5x)
 * - Enterprise: 999999 (Unlimited)
 */
export function getMaxMembersForPlan(plan?: string | null): number {
  if (plan === "enterprise") return 999999;
  if (plan === "pro") return 25;
  if (plan === "plus") return 10;
  return MAX_PROJECT_MEMBERS;
}

/**
 * Retrieves the maximum member capacity for a given project based on the project owner's plan.
 */
export async function getProjectMemberCapacity(projectId: string): Promise<number> {
  try {
    const adminClient = createAdminClient();
    const { data: project } = await adminClient
      .from("projects")
      .select("created_by")
      .eq("id", projectId)
      .maybeSingle();

    if (!project?.created_by) return MAX_PROJECT_MEMBERS;

    const { data: profile } = await adminClient
      .from("profiles")
      .select("plan")
      .eq("id", project.created_by)
      .maybeSingle();

    if (profile?.plan) {
      return getMaxMembersForPlan(profile.plan);
    }

    const { data: userData } = await adminClient.auth.admin.getUserById(project.created_by);
    return getMaxMembersForPlan(userData?.user?.user_metadata?.plan as string);
  } catch (err) {
    console.error("Failed to determine project member capacity:", err);
    return MAX_PROJECT_MEMBERS;
  }
}

/**
 * Generates a short, shareable, crypto-random invite code:
 * "NS-" + 5 uppercase hexadecimal characters (e.g. "NS-8A3F1").
 * 5 hex characters provide 1,048,576 possible combinations.
 */
export function generateInviteCode(): string {
  const hex = crypto.randomBytes(3).toString("hex").slice(0, 5).toUpperCase();
  return `NS-${hex}`;
}

/**
 * Converts a human project name into a URL-friendly slug.
 */
export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "project";
}

/**
 * Returns a human-friendly relative time string.
 */
export function formatRelativeTime(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 45) return "Updated just now";
  if (diffMin === 1) return "Updated 1 min ago";
  if (diffMin < 60) return `Updated ${diffMin} mins ago`;
  if (diffHour === 1) return "Updated 1 hour ago";
  if (diffHour < 24) return `Updated ${diffHour} hours ago`;
  if (diffDay === 1) return "Updated yesterday";
  if (diffDay < 7) return `Updated ${diffDay} days ago`;

  return `Updated ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

/**
 * Formats join time into friendly string (e.g. "Joined today", "Joined 3 days ago").
 */
export function formatJoinedDate(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Joined just now";
  if (diffMin < 60) return `Joined ${diffMin}m ago`;
  if (diffHour < 24) return `Joined ${diffHour}h ago`;
  if (diffDay === 1) return "Joined yesterday";
  if (diffDay < 30) return `Joined ${diffDay}d ago`;

  return `Joined ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

/**
 * Fetches all projects for the authenticated user along with collaborator info.
 */
export async function getUserProjects(userId: string): Promise<DashboardProject[]> {
  try {
    const adminClient = createAdminClient();

    // 1. Fetch user memberships
    const { data: memberRows, error: memberError } = await adminClient
      .from("project_members")
      .select("project_id, role, joined_at")
      .eq("user_id", userId);

    if (memberError) {
      console.error("Error fetching project members:", memberError);
    }

    const memberProjectIds = (memberRows || []).map((m) => m.project_id);

    // Also fetch any projects created by the user (as fallback)
    const { data: createdRows, error: createdError } = await adminClient
      .from("projects")
      .select("id")
      .eq("created_by", userId);

    if (createdError) {
      console.error("Error fetching created projects:", createdError);
    }

    const createdProjectIds = (createdRows || []).map((p) => p.id);
    const allProjectIds = Array.from(
      new Set([...memberProjectIds, ...createdProjectIds])
    );

    if (allProjectIds.length === 0) {
      return [];
    }

    const userRoleMap = new Map(
      (memberRows || []).map((m) => [m.project_id, m.role])
    );

    // 2. Fetch project details
    const { data: projectRows, error: projectsError } = await adminClient
      .from("projects")
      .select("id, slug, name, description, invite_code, created_by, created_at, updated_at")
      .in("id", allProjectIds)
      .order("updated_at", { ascending: false });

    if (projectsError || !projectRows) {
      console.error("Error fetching projects:", projectsError);
      return [];
    }

    // 3. Fetch all member counts for these projects
    const { data: allMembers, error: allMembersError } = await adminClient
      .from("project_members")
      .select("project_id, user_id, role, joined_at")
      .in("project_id", allProjectIds);

    if (allMembersError) {
      console.error("Error fetching all project members:", allMembersError);
    }

    const membersByProject = new Map<string, ProjectMemberInfo[]>();
    for (const m of allMembers || []) {
      const list = membersByProject.get(m.project_id) || [];
      list.push({
        userId: m.user_id,
        role: m.role as "owner" | "collaborator",
        joinedAt: formatJoinedDate(m.joined_at),
      });
      membersByProject.set(m.project_id, list);
    }

    // 4. Fetch pending join requests count for projects where user is owner
    const ownerProjectIds = projectRows
      .filter((p) => p.created_by === userId || userRoleMap.get(p.id) === "owner")
      .map((p) => p.id);

    const pendingRequestsCountMap = new Map<string, number>();

    if (ownerProjectIds.length > 0) {
      const { data: pendingRequests, error: reqError } = await adminClient
        .from("project_join_requests")
        .select("project_id")
        .in("project_id", ownerProjectIds)
        .eq("status", "pending");

      if (!reqError && pendingRequests) {
        for (const req of pendingRequests) {
          const current = pendingRequestsCountMap.get(req.project_id) || 0;
          pendingRequestsCountMap.set(req.project_id, current + 1);
        }
      }
    }

    // 5. Fetch project creators' plans to determine capacity limits
    const creatorIds = Array.from(new Set(projectRows.map((p) => p.created_by).filter(Boolean)));
    const creatorPlanMap = new Map<string, string>();
    if (creatorIds.length > 0) {
      const { data: creatorProfiles } = await adminClient
        .from("profiles")
        .select("id, plan")
        .in("id", creatorIds);
      for (const cp of creatorProfiles || []) {
        if (cp.plan) creatorPlanMap.set(cp.id, cp.plan);
      }
    }

    return projectRows.map((p) => {
      const memberList = membersByProject.get(p.id) || [];
      const fallbackRole = p.created_by === userId ? "owner" : "collaborator";
      const myRole = (userRoleMap.get(p.id) || fallbackRole) as "owner" | "collaborator";
      const plan = creatorPlanMap.get(p.created_by);

      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        inviteCode: p.invite_code,
        role: myRole,
        members: Math.max(memberList.length, 1),
        maxMembers: getMaxMembersForPlan(plan),
        memberList: memberList.length > 0 ? memberList : [{ userId, role: myRole }],
        pendingRequestsCount: pendingRequestsCountMap.get(p.id) || 0,
        updatedAt: formatRelativeTime(p.updated_at),
        createdAt: p.created_at,
      };
    });
  } catch (error) {
    console.error("Error in getUserProjects:", error);
    return [];
  }
}

/**
 * Creates a new project and assigns the creator as the 'owner'.
 */
export async function createProject(params: {
  name: string;
  description?: string | null;
  userId: string;
}): Promise<{ success: boolean; project?: DashboardProject; error?: string }> {
  const { name, description, userId } = params;
  const trimmedName = name.trim();

  if (!trimmedName) {
    return { success: false, error: "Project name is required." };
  }

  if (trimmedName.length > 80) {
    return { success: false, error: "Project name cannot exceed 80 characters." };
  }

  const adminClient = createAdminClient();

  // Generate unique slug
  const baseSlug = slugify(trimmedName);
  let finalSlug = baseSlug;
  let collisionCount = 0;

  while (collisionCount < 10) {
    const { data: existing } = await adminClient
      .from("projects")
      .select("id")
      .eq("slug", finalSlug)
      .maybeSingle();

    if (!existing) break;

    collisionCount++;
    const randomSuffix = crypto.randomBytes(2).toString("hex");
    finalSlug = `${baseSlug}-${randomSuffix}`;
  }

  // Generate unique invite code
  let inviteCode = generateInviteCode();
  let inviteCollision = 0;

  while (inviteCollision < 5) {
    const { data: existingCode } = await adminClient
      .from("projects")
      .select("id")
      .eq("invite_code", inviteCode)
      .maybeSingle();

    if (!existingCode) break;

    inviteCollision++;
    inviteCode = generateInviteCode();
  }

  // Insert project using admin client on server
  const { data: createdProject, error: projectError } = await adminClient
    .from("projects")
    .insert({
      name: trimmedName,
      slug: finalSlug,
      description: description?.trim() || null,
      invite_code: inviteCode,
      created_by: userId,
    })
    .select("id, slug, name, description, invite_code, created_by, created_at, updated_at")
    .single();

  if (projectError || !createdProject) {
    console.error("Failed to insert project:", projectError);
    return { success: false, error: projectError?.message || "Failed to create project." };
  }

  // Insert creator as owner in project_members
  const { error: memberError } = await adminClient.from("project_members").insert({
    project_id: createdProject.id,
    user_id: userId,
    role: "owner",
  });

  if (memberError) {
    console.error("Failed to insert owner in project_members:", memberError);
    // Cleanup orphaned project if member insert fails
    await adminClient.from("projects").delete().eq("id", createdProject.id);
    return { success: false, error: "Failed to initialize project membership." };
  }

  const dashboardProject: DashboardProject = {
    id: createdProject.id,
    slug: createdProject.slug,
    name: createdProject.name,
    description: createdProject.description,
    inviteCode: createdProject.invite_code,
    role: "owner",
    members: 1,
    memberList: [{ userId, role: "owner" }],
    updatedAt: "Updated just now",
    createdAt: createdProject.created_at,
  };

  return { success: true, project: dashboardProject };
}

/**
 * Requests to join an existing project using an invite code (NS-XXXXX).
 * Checks the banned members blocklist and enters the project's approval queue.
 */
export async function joinProjectByInviteCode(params: {
  inviteCode: string;
  userId: string;
}): Promise<{
  success: boolean;
  pendingApproval?: boolean;
  project?: DashboardProject;
  message?: string;
  error?: string;
}> {
  const { inviteCode, userId } = params;
  const normalizedCode = inviteCode.trim().toUpperCase();

  if (!normalizedCode) {
    return { success: false, error: "Please enter an invite code." };
  }

  // Validate format (NS-XXXXX)
  if (!/^NS-[A-F0-9]{4,8}$/i.test(normalizedCode)) {
    return {
      success: false,
      error: "Invalid invite code format. Codes look like NS-8A3F1.",
    };
  }

  const adminClient = createAdminClient();

  // Find project by invite code
  const { data: project, error: findError } = await adminClient
    .from("projects")
    .select("id, slug, name, description, invite_code, created_by, created_at, updated_at")
    .eq("invite_code", normalizedCode)
    .maybeSingle();

  if (findError || !project) {
    return {
      success: false,
      error: "No project found matching this invite code. Please check and try again.",
    };
  }

  // 1. Check if user is banned/kicked from this project
  const { data: bannedEntry } = await adminClient
    .from("project_banned_members")
    .select("id")
    .eq("project_id", project.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (bannedEntry) {
    return {
      success: false,
      error: "You were removed from this project by the owner and cannot rejoin with this invite code.",
    };
  }

  // 2. Check if user is already an active member
  const { data: existingMember } = await adminClient
    .from("project_members")
    .select("role")
    .eq("project_id", project.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingMember) {
    return {
      success: false,
      error: "You are already a member of this project.",
    };
  }

  // 3. Check if project has already reached full capacity based on owner's plan
  const { count: memberCount } = await adminClient
    .from("project_members")
    .select("user_id", { count: "exact", head: true })
    .eq("project_id", project.id);

  const capacity = await getProjectMemberCapacity(project.id);
  if ((memberCount || 0) >= capacity) {
    return {
      success: false,
      error: `This project is at full capacity (${capacity}/${capacity} members).`,
    };
  }

  // 4. Check for existing pending join request
  const { data: existingRequest } = await adminClient
    .from("project_join_requests")
    .select("id, status")
    .eq("project_id", project.id)
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle();

  const dashboardProject: DashboardProject = {
    id: project.id,
    slug: project.slug,
    name: project.name,
    description: project.description,
    inviteCode: project.invite_code,
    role: "collaborator",
    members: memberCount || 1,
    updatedAt: formatRelativeTime(project.updated_at),
    createdAt: project.created_at,
  };

  if (existingRequest) {
    return {
      success: true,
      pendingApproval: true,
      project: dashboardProject,
      message: "Your request to join is pending approval from the project owner.",
    };
  }

  // 5. Create join request
  const { error: reqError } = await adminClient.from("project_join_requests").insert({
    project_id: project.id,
    user_id: userId,
    status: "pending",
  });

  if (reqError) {
    console.error("Failed to create join request:", reqError);
    return { success: false, error: "Could not send join request. Please try again." };
  }

  return {
    success: true,
    pendingApproval: true,
    project: dashboardProject,
    message: "Request sent! The project owner must approve your request before you can join.",
  };
}

/**
 * Allows a collaborator to leave a project.
 */
export async function leaveProject(params: {
  projectId: string;
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  const { projectId, userId } = params;
  const adminClient = createAdminClient();

  // 1. Check user membership & role
  const { data: member, error: memberError } = await adminClient
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (memberError || !member) {
    return { success: false, error: "You are not a member of this project." };
  }

  if (member.role === "owner") {
    return {
      success: false,
      error: "As the project owner, you cannot leave the project. You can delete the project if you no longer need it.",
    };
  }

  // 2. Remove user from project_members
  const { error: deleteError } = await adminClient
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);

  if (deleteError) {
    console.error("Error leaving project:", deleteError);
    return { success: false, error: "Failed to leave the project. Please try again." };
  }

  await invalidateProjectMembershipCache(projectId, userId);

  return { success: true };
}

/**
 * Allows the project owner to delete a project and all associated memberships.
 */
export async function deleteProject(params: {
  projectId: string;
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  const { projectId, userId } = params;
  const adminClient = createAdminClient();

  // 1. Check if user is owner of the project
  const { data: member } = await adminClient
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  const { data: project } = await adminClient
    .from("projects")
    .select("created_by")
    .eq("id", projectId)
    .maybeSingle();

  const isOwner = member?.role === "owner" || project?.created_by === userId;

  if (!isOwner) {
    return { success: false, error: "Only the project owner can delete this project." };
  }

  // 2. Delete project (cascades to project_members)
  const { error: deleteError } = await adminClient
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (deleteError) {
    console.error("Error deleting project:", deleteError);
    return { success: false, error: "Failed to delete the project. Please try again." };
  }

  await invalidateProjectMembershipCache(projectId, userId);

  return { success: true };
}

/**
 * Fetches all members of a project with profile details (name, email, avatar).
 */
export async function getProjectMembers(params: {
  projectId: string;
  userId: string;
}): Promise<{ success: boolean; members?: ProjectMemberInfo[]; error?: string }> {
  const { projectId, userId } = params;
  const adminClient = createAdminClient();

  // 1. Check if requester is a member of this project
  const { data: isMember } = await adminClient
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  const { data: isCreator } = await adminClient
    .from("projects")
    .select("created_by")
    .eq("id", projectId)
    .maybeSingle();

  if (!isMember && isCreator?.created_by !== userId) {
    return { success: false, error: "You must be a member of this project to view collaborators." };
  }

  // 2. Fetch all project members ordered by joined_at asc
  const { data: memberRows, error: memberError } = await adminClient
    .from("project_members")
    .select("user_id, role, joined_at")
    .eq("project_id", projectId)
    .order("joined_at", { ascending: true });

  if (memberError || !memberRows) {
    return { success: false, error: "Failed to fetch collaborators." };
  }

  const userIds = memberRows.map((m) => m.user_id);

  // 3. Fetch profiles for all members
  const { data: profiles } = await adminClient
    .from("profiles")
    .select("id, full_name, email, username, avatar_url")
    .in("id", userIds);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  const members: ProjectMemberInfo[] = memberRows.map((m) => {
    const prof = profileMap.get(m.user_id);
    return {
      userId: m.user_id,
      role: m.role as "owner" | "collaborator",
      fullName: prof?.full_name || null,
      email: prof?.email || null,
      username: prof?.username || null,
      avatarUrl: prof?.avatar_url || null,
      joinedAt: formatJoinedDate(m.joined_at),
    };
  });

  return { success: true, members };
}

/**
 * Allows the project owner to kick/remove a collaborator from the project.
 */
export async function kickProjectMember(params: {
  projectId: string;
  targetUserId: string;
  requesterUserId: string;
}): Promise<{ success: boolean; error?: string }> {
  const { projectId, targetUserId, requesterUserId } = params;
  const adminClient = createAdminClient();

  if (targetUserId === requesterUserId) {
    return { success: false, error: "You cannot kick yourself from the project." };
  }

  // 1. Verify requester is the owner
  const { data: requesterMember } = await adminClient
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", requesterUserId)
    .maybeSingle();

  const { data: project } = await adminClient
    .from("projects")
    .select("created_by")
    .eq("id", projectId)
    .maybeSingle();

  const isOwner =
    requesterMember?.role === "owner" || project?.created_by === requesterUserId;

  if (!isOwner) {
    return { success: false, error: "Only the project owner can remove collaborators." };
  }

  // 2. Remove target member
  const { error: kickError } = await adminClient
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", targetUserId);

  if (kickError) {
    console.error("Error kicking member:", kickError);
    return { success: false, error: "Failed to remove collaborator. Please try again." };
  }

  // 3. Automatically add to project_banned_members so they cannot rejoin using the invite code
  await adminClient
    .from("project_banned_members")
    .upsert(
      {
        project_id: projectId,
        user_id: targetUserId,
        banned_by: requesterUserId,
        reason: "Removed by project owner",
      },
      { onConflict: "project_id,user_id" }
    );

  await invalidateProjectMembershipCache(projectId, targetUserId);

  return { success: true };
}

/**
 * Fetches all pending join requests for a project (Owner only).
 */
export async function getProjectJoinRequests(params: {
  projectId: string;
  userId: string;
}): Promise<{ success: boolean; requests?: ProjectJoinRequestInfo[]; error?: string }> {
  const { projectId, userId } = params;
  const adminClient = createAdminClient();

  const isOwner = await isProjectOwner(projectId, userId);
  if (!isOwner) {
    return { success: false, error: "Only the project owner can view join requests." };
  }

  const { data: requestRows, error } = await adminClient
    .from("project_join_requests")
    .select("id, project_id, user_id, status, created_at")
    .eq("project_id", projectId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error || !requestRows) {
    return { success: false, error: "Failed to fetch join requests." };
  }

  const userIds = requestRows.map((r) => r.user_id);
  if (userIds.length === 0) {
    return { success: true, requests: [] };
  }

  const { data: profiles } = await adminClient
    .from("profiles")
    .select("id, full_name, email, username, avatar_url")
    .in("id", userIds);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  const requests: ProjectJoinRequestInfo[] = requestRows.map((r) => {
    const prof = profileMap.get(r.user_id);
    return {
      id: r.id,
      projectId: r.project_id,
      userId: r.user_id,
      status: r.status as "pending" | "approved" | "declined",
      fullName: prof?.full_name || null,
      email: prof?.email || null,
      username: prof?.username || null,
      avatarUrl: prof?.avatar_url || null,
      createdAt: formatJoinedDate(r.created_at),
    };
  });

  return { success: true, requests };
}

/**
 * Resolves a project join request (approve or decline).
 */
export async function resolveProjectJoinRequest(params: {
  requestId: string;
  projectId: string;
  action: "approve" | "decline";
  userId: string;
}): Promise<{
  success: boolean;
  status?: "approved" | "declined";
  targetUserId?: string;
  projectSlug?: string;
  error?: string;
}> {
  const { requestId, projectId, action, userId } = params;
  const adminClient = createAdminClient();

  const isOwner = await isProjectOwner(projectId, userId);
  if (!isOwner) {
    return { success: false, error: "Only the project owner can resolve join requests." };
  }

  const { data: req } = await adminClient
    .from("project_join_requests")
    .select("id, project_id, user_id, status")
    .eq("id", requestId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!req || req.status !== "pending") {
    return { success: false, error: "Join request not found or already resolved." };
  }

  const now = new Date().toISOString();

  if (action === "approve") {
    // Enforce project capacity limit based on owner's plan
    const { count: currentMemberCount } = await adminClient
      .from("project_members")
      .select("user_id", { count: "exact", head: true })
      .eq("project_id", projectId);

    const capacity = await getProjectMemberCapacity(projectId);
    if ((currentMemberCount || 0) >= capacity) {
      return {
        success: false,
        error: `Project has reached maximum capacity (${capacity}/${capacity} members). You must remove a member before accepting new requests.`,
      };
    }

    // Insert into project_members
    await adminClient.from("project_members").upsert(
      {
        project_id: projectId,
        user_id: req.user_id,
        role: "collaborator",
      },
      { onConflict: "project_id,user_id" }
    );

    // If user was previously on banned list, remove them from banned
    await adminClient
      .from("project_banned_members")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", req.user_id);

    await adminClient
      .from("project_join_requests")
      .update({
        status: "approved",
        resolved_at: now,
        resolved_by: userId,
      })
      .eq("id", requestId);

    const { data: project } = await adminClient
      .from("projects")
      .select("slug")
      .eq("id", projectId)
      .maybeSingle();

    await invalidateProjectMembershipCache(projectId, req.user_id);

    return {
      success: true,
      status: "approved",
      targetUserId: req.user_id,
      projectSlug: project?.slug,
    };
  } else {
    await adminClient
      .from("project_join_requests")
      .update({
        status: "declined",
        resolved_at: now,
        resolved_by: userId,
      })
      .eq("id", requestId);

    return { success: true, status: "declined", targetUserId: req.user_id };
  }
}

/**
 * Fetches banned/removed members for a project (Owner only).
 */
export async function getProjectBannedMembers(params: {
  projectId: string;
  userId: string;
}): Promise<{ success: boolean; bannedMembers?: ProjectBannedMemberInfo[]; error?: string }> {
  const { projectId, userId } = params;
  const adminClient = createAdminClient();

  const isOwner = await isProjectOwner(projectId, userId);
  if (!isOwner) {
    return { success: false, error: "Only the project owner can view removed collaborators." };
  }

  const { data: rows, error } = await adminClient
    .from("project_banned_members")
    .select("id, project_id, user_id, reason, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error || !rows) {
    return { success: false, error: "Failed to fetch banned collaborators." };
  }

  const userIds = rows.map((r) => r.user_id);
  if (userIds.length === 0) {
    return { success: true, bannedMembers: [] };
  }

  const { data: profiles } = await adminClient
    .from("profiles")
    .select("id, full_name, email, username, avatar_url")
    .in("id", userIds);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  const bannedMembers: ProjectBannedMemberInfo[] = rows.map((r) => {
    const prof = profileMap.get(r.user_id);
    return {
      id: r.id,
      projectId: r.project_id,
      userId: r.user_id,
      reason: r.reason,
      fullName: prof?.full_name || null,
      email: prof?.email || null,
      username: prof?.username || null,
      avatarUrl: prof?.avatar_url || null,
      bannedAt: formatJoinedDate(r.created_at),
    };
  });

  return { success: true, bannedMembers };
}

/**
 * Unbans a removed collaborator, allowing them to request to join again (Owner only).
 */
export async function unbanProjectMember(params: {
  projectId: string;
  targetUserId: string;
  requesterUserId: string;
}): Promise<{ success: boolean; error?: string }> {
  const { projectId, targetUserId, requesterUserId } = params;
  const adminClient = createAdminClient();

  const isOwner = await isProjectOwner(projectId, requesterUserId);
  if (!isOwner) {
    return { success: false, error: "Only the project owner can unblock collaborators." };
  }

  const { error } = await adminClient
    .from("project_banned_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", targetUserId);

  if (error) {
    console.error("Failed to unban member:", error);
    return { success: false, error: "Failed to unblock collaborator." };
  }

  await invalidateProjectMembershipCache(projectId, targetUserId);

  return { success: true };
}

/**
 * Fetches a project by its URL slug.
 */
export async function getProjectBySlug(slug: string) {
  const adminClient = createAdminClient();
  const { data: project } = await adminClient
    .from("projects")
    .select("id, slug, name, description, invite_code, created_by, created_at, updated_at")
    .eq("slug", slug)
    .maybeSingle();

  return project;
}

/**
 * Invalidates cached membership status in Redis for a project and user.
 */
export async function invalidateProjectMembershipCache(projectId: string, userId?: string): Promise<void> {
  if (userId) {
    await safeRedisDel([
      `cache:pm:${projectId}:${userId}`,
      `cache:po:${projectId}:${userId}`,
    ]);
  }
}

/**
 * Checks if a user is a member or creator of a project (cached in Redis with 120s TTL).
 */
export async function isProjectMember(projectId: string, userId: string): Promise<boolean> {
  const cacheKey = `cache:pm:${projectId}:${userId}`;
  const cached = await safeRedisGet<boolean>(cacheKey);
  if (typeof cached === "boolean") {
    return cached;
  }

  const adminClient = createAdminClient();

  // If user is banned/kicked from this project, immediately return false
  const { data: banned } = await adminClient
    .from("project_banned_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (banned) {
    await safeRedisSet(cacheKey, false, { ex: 120 });
    return false;
  }

  const { data: member } = await adminClient
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (member) {
    await safeRedisSet(cacheKey, true, { ex: 120 });
    return true;
  }

  const { data: project } = await adminClient
    .from("projects")
    .select("created_by")
    .eq("id", projectId)
    .maybeSingle();

  const isMember = project?.created_by === userId;
  await safeRedisSet(cacheKey, isMember, { ex: 120 });
  return isMember;
}

/**
 * Checks if a user is the owner of a project (cached in Redis with 120s TTL).
 */
export async function isProjectOwner(projectId: string, userId: string): Promise<boolean> {
  const cacheKey = `cache:po:${projectId}:${userId}`;
  const cached = await safeRedisGet<boolean>(cacheKey);
  if (typeof cached === "boolean") {
    return cached;
  }

  const adminClient = createAdminClient();

  // If user is banned/kicked, cannot be owner
  const { data: banned } = await adminClient
    .from("project_banned_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (banned) {
    await safeRedisSet(cacheKey, false, { ex: 120 });
    return false;
  }

  const { data: member } = await adminClient
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .eq("role", "owner")
    .maybeSingle();

  if (member) {
    await safeRedisSet(cacheKey, true, { ex: 120 });
    return true;
  }

  const { data: project } = await adminClient
    .from("projects")
    .select("created_by")
    .eq("id", projectId)
    .maybeSingle();

  const isOwner = project?.created_by === userId;
  await safeRedisSet(cacheKey, isOwner, { ex: 120 });
  return isOwner;
}

