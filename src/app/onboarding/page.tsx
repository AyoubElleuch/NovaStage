import { requireIncompleteProfile, isAdminRole } from "@/lib/auth/session";
import OnboardingFlow from "./onboarding-flow";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await requireIncompleteProfile();
  const isAdmin =
    isAdminRole(session.roles) || isAdminRole(session.profile?.role);
  const destination = isAdmin ? "/admin" : "/dashboard";

  return (
    <OnboardingFlow
      initialFullName={session.profile?.full_name || ""}
      initialUsername={session.profile?.username || ""}
      destination={destination}
    />
  );
}
