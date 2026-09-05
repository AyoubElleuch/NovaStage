import SubscriptionWorkspace from "./subscription-workspace";

export const metadata = {
  title: "Subscription & Pricing — NovaStage",
  description: "Explore NovaStage pricing tiers, AI quotas, and team plans.",
};

export default async function SubscriptionPage() {
  return <SubscriptionWorkspace />;
}
