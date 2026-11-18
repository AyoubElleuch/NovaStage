"use client";

import { useState } from "react";
import useSWR from "swr";
import { Check, Crown, Sparkles, Building2, Zap } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import type { DashboardSettingsData } from "@/lib/dashboard-data";
import { BILLING, PLANNED_NOTE, PLAN_FEATURES, PLAN_LIMITS, PLAN_PRICES, normalizePlan, type PlanId } from "@/lib/plans";
import BillingComingSoonModal from "./billing-coming-soon-modal";
import SubscriptionLoading from "./loading";

const tiers: { id: PlanId; name: string; description: string; icon: typeof Zap }[] = [
  { id: "free", name: "Free", description: "Personal sandboxes and basic architecture planning.", icon: Zap },
  { id: "plus", name: "Plus", description: "More AI requests and larger project teams.", icon: Sparkles },
  { id: "pro", name: "Pro", description: "For active engineering teams with larger projects.", icon: Crown },
  { id: "enterprise", name: "Enterprise", description: "Custom terms for large organizations.", icon: Building2 },
];

export default function SubscriptionWorkspace() {
  const { data, error, isLoading, mutate } = useSWR<DashboardSettingsData>("/api/dashboard/settings", fetcher<DashboardSettingsData>);
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");
  const [selectedTier, setSelectedTier] = useState<PlanId | null>(null);
  if (isLoading && !data) return <SubscriptionLoading />;
  if (error && !data) return <div role="alert" className="space-y-3 p-6"><p>We couldn't load your plan.</p><button type="button" onClick={() => void mutate()} className="rounded-lg border px-4 py-2">Try again</button></div>;
  const plan = normalizePlan(data?.profile?.plan);
  const ActiveIcon = tiers.find(tier => tier.id === plan)!.icon;

  return <div className="space-y-8 pb-16">
    <header className="dash-enter max-w-3xl">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">Account &amp; Billing</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">Pricing &amp; Account Tiers</h1>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Compare AI request allowances and project capacity.</p>
    </header>
    <section className="dash-enter flex items-center gap-3.5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-[#283548] dark:bg-[#161d27]">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300"><ActiveIcon className="h-6 w-6" /></div>
      <div><h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Active plan: <span className="uppercase">{plan}</span></h2><p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{PLAN_FEATURES[plan].slice(0, 2).join(" · ")}</p></div>
    </section>
    <p className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600 dark:border-[#283548] dark:bg-[#1e2634] dark:text-neutral-300">{BILLING.note} During beta, administrators assign plans.</p>
    <div role="group" aria-label="Billing interval" className="flex justify-center gap-2">
      {(["monthly", "annual"] as const).map(value => <button key={value} type="button" aria-pressed={interval === value} onClick={() => setInterval(value)} className={`rounded-lg border px-4 py-2 text-xs font-medium ${interval === value ? "border-blue-600 bg-blue-600 text-white" : "border-neutral-200 text-neutral-600 dark:border-[#283548] dark:text-neutral-300"}`}>{value === "monthly" ? "Monthly" : "Annual · Save 20%"}</button>)}
    </div>
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {tiers.map(tier => {
        const current = tier.id === plan;
        const price = tier.id === "enterprise" ? null : PLAN_PRICES[tier.id];
        return <article key={tier.id} className={`relative flex flex-col justify-between rounded-2xl bg-white p-6 shadow-xs dark:bg-[#161d27] ${tier.id === "plus" ? "border-2 border-blue-500 shadow-lg shadow-blue-500/10" : "border border-neutral-200 dark:border-[#283548]"}`}>
          {tier.id === "plus" && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-md bg-blue-600 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">Recommended</span>}
          <div>
            <div className="flex items-center justify-between gap-2"><h3 className="text-base font-bold text-neutral-900 dark:text-white">{tier.name}</h3>{current && <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600 dark:bg-[#1e2736] dark:text-neutral-300">Current</span>}</div>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{tier.description}</p>
            <div className="mt-5 text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">{price?.[interval] || "Custom"}<span className="ml-1 text-xs font-normal text-neutral-400">{price ? "/ month" : "/ volume"}</span></div>
            <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{tier.id === "free" ? "Free forever" : !price ? "Terms agreed individually" : interval === "annual" ? `Planned: ${price.annualTotal}/year` : "Planned: billed monthly"}</p>
            <ul className="mt-6 space-y-3 text-xs text-neutral-600 dark:text-neutral-300">{PLAN_FEATURES[tier.id].map(feature => <li key={feature} className="flex items-start gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /><span>{feature}</span></li>)}</ul>
          </div>
          <div className="mt-8 border-t border-neutral-100 pt-4 dark:border-[#283548]"><button type="button" disabled={current || tier.id === "free"} onClick={() => setSelectedTier(tier.id)} className="min-h-11 w-full rounded-lg bg-neutral-900 px-3 py-2.5 text-xs font-semibold text-white disabled:cursor-default disabled:opacity-50 dark:bg-emerald-600">{current ? "Active plan" : tier.id === "free" ? "Included" : tier.id === "enterprise" ? "Contact us" : "Get notified"}</button></div>
        </article>;
      })}
    </div>
    <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{PLANNED_NOTE}</p>
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Plan limits</h2>
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-[#283548]"><table className="w-full text-left text-xs"><caption className="sr-only">Currently enforced plan limits</caption><thead><tr><th scope="col" className="p-4">Capability</th>{tiers.map(tier => <th key={tier.id} scope="col" className="p-4">{tier.name}</th>)}</tr></thead><tbody>{(["aiRequests", "members"] as const).map(limit => <tr key={limit} className="border-t border-neutral-200 dark:border-[#283548]"><th scope="row" className="p-4 font-medium">{limit === "aiRequests" ? "AI requests" : "Members per project"}</th>{tiers.map(tier => <td key={tier.id} className="p-4">{tier.id === "enterprise" ? "Unlimited" : PLAN_LIMITS[tier.id][limit]}</td>)}</tr>)}</tbody></table></div>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">A successful generation uses one request. Failed generations restore the allowance. Project capacity follows the owner's plan and includes the owner.</p>
    </section>
    <BillingComingSoonModal isOpen={selectedTier !== null} selectedPlan={selectedTier} onClose={() => setSelectedTier(null)} />
  </div>;
}
