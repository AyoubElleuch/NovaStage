import { requireAuth, getAuthenticatedProfile } from "@/lib/auth/session";
import { getUserProjects } from "@/lib/projects";
import DashboardSidebar from "./dashboard-sidebar";
import DashboardDataProvider from "./dashboard-data-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth("/login");
  const session = await getAuthenticatedProfile();
  const userEmail = user.email;
  const userRole = session?.profile?.role || session?.roles?.[0] || "developer";
  const userProjects = await getUserProjects(user.id);

  const settings = {
    email: user.email || session?.profile?.email || "",
    profile: session?.profile
      ? {
          full_name: session.profile.full_name,
          username: session.profile.username,
          avatar_url: session.profile.avatar_url,
          role: session.profile.role,
          created_at: session.profile.created_at,
        }
      : null,
  };

  const projects = {
    projects: userProjects,
    userName: session?.profile?.full_name || user.email?.split("@")[0] || "Developer",
  };

  return (
    <div className="dashboard-v2 flex h-dvh overflow-hidden bg-[#fafafa] text-neutral-900 antialiased">
      <DashboardSidebar userEmail={userEmail} userRole={userRole} />
      <DashboardDataProvider projects={projects} settings={settings}>
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10 sm:py-12">
            {children}
          </div>
        </main>
      </DashboardDataProvider>
    </div>
  );
}
