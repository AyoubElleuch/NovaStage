import { redirect } from "next/navigation";
import { getAuthenticatedProfile, isAdminRole, isProfileComplete } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const session = await getAuthenticatedProfile();
  if (session?.user) {
    if (!isProfileComplete(session.profile)) {
      redirect("/onboarding");
    }

    const isAdmin =
      isAdminRole(session.roles) || isAdminRole(session.profile?.role);
    redirect(isAdmin ? "/admin" : "/dashboard");
  }

  redirect("/login");
}
