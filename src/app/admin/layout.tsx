import { requireAdmin } from "@/lib/auth/session";
import AdminSidebar from "./admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin("/login");
  const userEmail = session.user.email;
  const userRole = session.profile?.role || "admin";

  return (
    <div className="admin-shell">
      <AdminSidebar userEmail={userEmail} userRole={userRole} />
      <main className="admin-main">
        <div className="admin-main__inner">{children}</div>
      </main>
    </div>
  );
}
