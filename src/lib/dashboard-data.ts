export interface DashboardProject {
  slug: string;
  name: string;
  description: string;
  updatedAt: string;
  members: number;
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
  created_at?: string | null;
}

export interface DashboardSettingsData {
  email: string;
  profile: DashboardProfile | null;
}

export const dashboardProjects: DashboardProject[] = [
  {
    slug: "novastage-web",
    name: "novastage-web",
    description: "Production website plan",
    updatedAt: "Updated 2 mins ago",
    members: 4,
  },
  {
    slug: "novastage-api-service",
    name: "novastage-api-service",
    description: "Service architecture and flows",
    updatedAt: "Updated 45 mins ago",
    members: 2,
  },
  {
    slug: "novastage-docs",
    name: "novastage-docs",
    description: "Product documentation structure",
    updatedAt: "Updated 3 hours ago",
    members: 1,
  },
];
