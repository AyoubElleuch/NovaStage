export interface ProjectMemberInfo {
  userId: string;
  role: "owner" | "collaborator";
  fullName?: string | null;
  email?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  joinedAt?: string;
}

export interface ProjectJoinRequestInfo {
  id: string;
  projectId: string;
  userId: string;
  status: "pending" | "approved" | "declined";
  fullName?: string | null;
  email?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface ProjectBannedMemberInfo {
  id: string;
  projectId: string;
  userId: string;
  reason?: string | null;
  fullName?: string | null;
  email?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  bannedAt: string;
}

export interface DashboardProject {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  inviteCode?: string;
  role?: "owner" | "collaborator";
  updatedAt: string;
  createdAt?: string;
  members: number;
  maxMembers?: number;
  memberList?: ProjectMemberInfo[];
  pendingRequestsCount?: number;
}

export interface DashboardProjectsData {
  projects: DashboardProject[];
  userName: string;
}

export interface DashboardProfile {
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  plan?: "free" | "plus" | "pro" | "enterprise" | null;
  created_at?: string | null;
}

export interface DashboardSettingsData {
  email: string;
  profile: DashboardProfile | null;
}
