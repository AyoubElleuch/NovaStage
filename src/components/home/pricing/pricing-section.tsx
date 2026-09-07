"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import BillingComingSoonModal from "@/app/dashboard/subscription/billing-coming-soon-modal";

type BillingInterval = "monthly" | "annual";

type Plan = {
  name: string;
  description: string;
  monthlyPrice: string;
  annualPrice: string;
  monthlyBilling: string;
  annualBilling: string;
  features: string[];
  action: string;
  featured?: boolean;
};

const plans: Plan[] = [
  {
    name: "Free",
    description: "Personal sandboxes and basic architecture planning.",
    monthlyPrice: "$0",
    annualPrice: "$0",
    monthlyBilling: "Free forever",
    annualBilling: "Free forever",
    features: ["10 lifetime AI workflow requests", "Standard models (Gemini Flash)", "Up to 5 members per project", "Real-time collaborative canvas", "Community support"],
    action: "Create free account",
  },
  {
    name: "Plus",
    description: "Expanded intelligence and larger team collaboration.",
    monthlyPrice: "$1.99",
    annualPrice: "$1.59",
    monthlyBilling: "Billed monthly",
    annualBilling: "Billed annually ($19.00/yr)",
    features: ["3x AI limit (30 requests)", "Enhanced reasoning models (Gemini Pro, Sonnet)", "Up to 10 members per project (2x limit)", "Unlimited project canvas checkpoints", "Priority real-time canvas sync", "Standard email support"],
    action: "Join the beta",
    featured: true,
  },
  {
    name: "Pro",
    description: "For power architects, lead engineers, and active studios.",
    monthlyPrice: "$4.99",
    annualPrice: "$3.99",
    monthlyBilling: "Billed monthly",
    annualBilling: "Billed annually ($47.90/yr)",
    features: ["5x AI limit (50 requests)", "Flagship frontier models (Gemini Ultra, Opus)", "Up to 25 members per project", "Priority beta access to new features", "Checkpoint rollbacks & branch diffs", "24/7 dedicated support"],
    action: "Join the beta",
  },
  {
    name: "Enterprise",
    description: "Custom setups, enterprise security, and dedicated infrastructure.",
    monthlyPrice: "Custom",
    annualPrice: "Custom",
    monthlyBilling: "Annual or multi-year terms",
    annualBilling: "Annual or multi-year terms",
    features: ["Unlimited AI quota & BYOK keys", "Unlimited project members & teams", "Dedicated account manager & custom SLA", "SSO / SAML & audit logging", "Private VPC / On-premise deployment"],
    action: "Contact us",
  },
];

export default function PricingSection() {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const [selectedPlan, setSelectedPlan] = useState<"free" | "plus" | "pro" | "enterprise" | null>(null);

  return <section id="pricing" className="home-pricing" aria-labelledby="pricing-title">
    <div className="home-pricing-heading home-reveal">
      <div>
        <h2 id="pricing-title">Start free.<br /><span>Scale when the system does.</span></h2>
      </div>
      <div className="home-billing-control">
        <div className="home-billing-toggle" role="group" aria-label="Billing interval">
          <button type="button" aria-pressed={billingInterval === "monthly"} onClick={() => setBillingInterval("monthly")}>Monthly</button>
          <button type="button" aria-pressed={billingInterval === "annual"} onClick={() => setBillingInterval("annual")}>Annual</button>
        </div>
        <span>Save 20% annually</span>
      </div>
    </div>

    <div className="home-pricing-grid">
      {plans.map((plan) => {
        const isEnterprise = plan.name === "Enterprise";
        return <article key={plan.name} className="home-price-card home-reveal" data-plan={plan.name.toLowerCase()} data-featured={plan.featured || undefined}>
          {plan.featured && <span className="home-plan-badge">Recommended</span>}
          <div className="home-plan-title"><h3>{plan.name}</h3></div>
          <p className="home-plan-description">{plan.description}</p>
          <div className="home-plan-price-wrap">
            {billingInterval === "annual" && !isEnterprise && plan.monthlyPrice !== "$0" && <del>{plan.monthlyPrice} / month</del>}
            <div className="home-plan-price"><strong>{billingInterval === "monthly" ? plan.monthlyPrice : plan.annualPrice}</strong><span>{isEnterprise ? "/ volume" : "/ month"}</span></div>
          </div>
          <p className="home-plan-billing">{billingInterval === "monthly" ? plan.monthlyBilling : plan.annualBilling}</p>
          <ul>{plan.features.map((feature) => <li key={feature}><Check size={14} /><span>{feature}</span></li>)}</ul>
          <button type="button" className="home-plan-action" onClick={() => setSelectedPlan(plan.name.toLowerCase() as "free" | "plus" | "pro" | "enterprise")}>{plan.action}</button>
        </article>;
      })}
    </div>
    <p className="home-pricing-note home-reveal">Early beta preview. Paid billing activates after launch; published rates and plan capacity are shown above.</p>
    <BillingComingSoonModal isOpen={selectedPlan !== null} selectedPlan={selectedPlan} onClose={() => setSelectedPlan(null)} />
  </section>;
}