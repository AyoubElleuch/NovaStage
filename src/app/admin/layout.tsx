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
    <div className="dashboard-v2 flex h-dvh overflow-hidden bg-[#fafafa] text-neutral-900 antialiased">
      <AdminSidebar userEmail={userEmail} userRole={userRole} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10 sm:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
