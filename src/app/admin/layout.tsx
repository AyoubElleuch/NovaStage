import { requireAdmin } from "@/lib/auth/session";
import AdminSidebar from "./admin-sidebar";
import AdminContentFrame from "./admin-content-frame";
import { MobileNavProvider } from "@/lib/mobile-nav-context";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin("/login");
  const userEmail = session.user.email;
  const userRole = session.roles.includes("super_admin")
    ? "super_admin"
    : session.profile?.role || session.roles[0] || "admin";

  return (
    <MobileNavProvider>
      <div className="dashboard-v2 flex min-h-0 h-[calc(100dvh-var(--announcement-height))] overflow-hidden bg-[#fafafa] text-neutral-900 antialiased dark:bg-[#0f141c] dark:text-[#f1f5f9]">
        <AdminSidebar userEmail={userEmail} userRole={userRole} />
        <AdminContentFrame>{children}</AdminContentFrame>
      </div>
    </MobileNavProvider>
  );
}
