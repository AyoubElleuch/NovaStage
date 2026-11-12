import type { Metadata } from "next";
import PricingPageView from "@/components/home/pricing/pricing-page-view";

export const metadata: Metadata = {
  title: "Pricing — NovaStage",
  description: "Explore NovaStage plan limits, team capacities, and early beta pricing.",
};

export default function PricingPage() {
  return <PricingPageView />;
}
