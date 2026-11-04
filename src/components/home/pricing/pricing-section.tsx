"use client";

import { useCallback, useState } from "react";
import { Check } from "lucide-react";
import BillingComingSoonModal from "@/app/dashboard/subscription/billing-coming-soon-modal";
import { BILLING, PLANNED_NOTE, PLAN_FEATURES, PLAN_PRICES } from "@/lib/plans";
import AuthTransitionLink from "../navigation/auth-transition-link";

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
    monthlyPrice: PLAN_PRICES.free.monthly,
    annualPrice: PLAN_PRICES.free.annual,
    monthlyBilling: "Free forever",
    annualBilling: "Free forever",
    features: PLAN_FEATURES.free,
    action: "Create free account",
  },
  {
    name: "Plus",
    description: "More AI requests and larger project teams.",
    monthlyPrice: PLAN_PRICES.plus.monthly,
    annualPrice: PLAN_PRICES.plus.annual,
    monthlyBilling: "Planned: billed monthly",
    annualBilling: `Planned: billed annually (${PLAN_PRICES.plus.annualTotal}/yr)`,
    features: PLAN_FEATURES.plus,
    action: "Get notified",
    featured: true,
  },
  {
    name: "Pro",
    description: "For active engineering teams with larger projects.",
    monthlyPrice: PLAN_PRICES.pro.monthly,
    annualPrice: PLAN_PRICES.pro.annual,
    monthlyBilling: "Planned: billed monthly",
    annualBilling: `Planned: billed annually (${PLAN_PRICES.pro.annualTotal}/yr)`,
    features: PLAN_FEATURES.pro,
    action: "Get notified",
  },
  {
    name: "Enterprise",
    description: "Custom terms for large organizations.",
    monthlyPrice: "Custom",
    annualPrice: "Custom",
    monthlyBilling: "Annual or multi-year terms",
    annualBilling: "Annual or multi-year terms",
    features: PLAN_FEATURES.enterprise,
    action: "Contact us",
  },
];

export default function PricingSection() {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const [selectedPlan, setSelectedPlan] = useState<"free" | "plus" | "pro" | "enterprise" | null>(null);
  const closeModal = useCallback(() => setSelectedPlan(null), []);

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
          {plan.name === "Free"
            ? <AuthTransitionLink href="/signup" className="home-plan-action">{plan.action}</AuthTransitionLink>
            : <button type="button" className="home-plan-action" onClick={() => setSelectedPlan(plan.name.toLowerCase() as "free" | "plus" | "pro" | "enterprise")}>{plan.action}</button>}
        </article>;
      })}
    </div>
    <p className="home-pricing-note home-reveal">{BILLING.note} {PLANNED_NOTE}</p>
    <BillingComingSoonModal isOpen={selectedPlan !== null} selectedPlan={selectedPlan} onClose={closeModal} variant="landing" />
  </section>;
}