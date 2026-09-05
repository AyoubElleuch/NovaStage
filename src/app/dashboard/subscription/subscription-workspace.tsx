"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { DashboardSettingsData } from "@/lib/dashboard-data";
import {
  Check,
  Sparkles,
  Crown,
  Building2,
  HelpCircle,
  Zap,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import BillingComingSoonModal from "./billing-coming-soon-modal";
import SubscriptionLoading from "./loading";

export default function SubscriptionWorkspace() {
  const { data, isLoading } = useSWR<DashboardSettingsData>(
    "/api/dashboard/settings",
    fetcher<DashboardSettingsData>
  );

  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("monthly");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<"plus" | "pro" | "enterprise" | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  if (isLoading && !data) {
    return <SubscriptionLoading />;
  }

  const userPlan = data?.profile?.plan || "free";

  const tierRank: Record<string, number> = {
    free: 0,
    plus: 1,
    pro: 2,
    enterprise: 3,
  };
  const currentRank = tierRank[userPlan] ?? 0;

  const handleOpenModal = (tier: "plus" | "pro" | "enterprise") => {
    setSelectedTier(tier);
    setModalOpen(true);
  };

  const plusPrice = billingInterval === "monthly" ? "$1.99" : "$1.59";
  const proStandardPrice = billingInterval === "monthly" ? "$4.99" : "$3.99";
  const proDiscountedPrice = billingInterval === "monthly" ? "$3.00" : "$2.40";
  const proPrice = userPlan === "plus" ? proDiscountedPrice : proStandardPrice;

  const faqs = [
    {
      question: "If I am already on Plus and upgrade to Pro, do I lose money?",
      answer:
        "No! Your existing Plus subscription is automatically credited as a discount toward Pro. You only pay the prorated difference ($3.00/mo instead of $4.99/mo) so you never lose the money you spent on Plus.",
    },
    {
      question: "When will live payment processing be activated?",
      answer:
        "NovaStage is currently operating in early beta preview while our business registration and payment gateway accounts are finalized. All features shown here will be billable once published, and early beta testers will receive special launch discounts.",
    },
    {
      question: "How does the AI assistant request limit work?",
      answer:
        "Each AI workflow prompt generated on the canvas consumes 1 quota token. Free accounts have 10 initial requests. The Plus plan expands your quota to 30 requests with higher reasoning models, and Pro provides 50 requests with flagship frontier models.",
    },
    {
      question: "How do project collaborator member limits work?",
      answer:
        "Free projects can host up to 5 members (1 owner + 4 collaborators) with live multi-cursor sync. Upgrading to Plus raises this limit to 10 members per project, and Pro supports up to 25 team members.",
    },
    {
      question: "Can an administrator grant me temporary Plus or Pro access?",
      answer:
        "Yes! During this preview phase, Super Administrators can assign test tiers to any account directly from the Super Admin Console.",
    },
  ];

  return (
    <div className="space-y-10 pb-16">
      {/* Header */}
      <header className="dash-enter max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
          Account &amp; Billing
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
          Pricing &amp; Account Tiers
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Scale your cloud architecture workflows, invite more collaborators, and unlock frontier AI models.
        </p>
      </header>

      {/* Current Plan Status Banner */}
      <section
        className="dash-enter flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs sm:p-6 dark:border-[#283548] dark:bg-[#161d27]"
        style={{ "--dash-delay": "50ms" } as React.CSSProperties}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`grid h-12 w-12 place-items-center rounded-xl ${
              userPlan === "pro"
                ? "bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300"
                : userPlan === "plus"
                ? "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300"
                : userPlan === "enterprise"
                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "bg-neutral-100 text-neutral-600 dark:bg-[#1e2736] dark:text-neutral-300"
            }`}
          >
            {userPlan === "pro" ? (
              <Crown className="h-6 w-6" />
            ) : userPlan === "plus" ? (
              <Sparkles className="h-6 w-6" />
            ) : userPlan === "enterprise" ? (
              <Building2 className="h-6 w-6" />
            ) : (
              <Zap className="h-6 w-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
                Active Plan: <span className="uppercase">{userPlan}</span>
              </h2>
              <span className="rounded-md border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-600 dark:border-[#283548] dark:bg-[#1e2634] dark:text-neutral-300">
                Active
              </span>
            </div>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {userPlan === "free"
                ? "Free tier with 10 AI workflow limit and 5 members per project."
                : userPlan === "plus"
                ? "Plus tier with 3x AI limit (30 requests) and 10 members per project."
                : userPlan === "pro"
                ? "Pro tier with 5x AI limit (50 requests), flagship models, and 25 members."
                : "Enterprise tier with unlimited AI quota and custom capacity."}
            </p>
          </div>
        </div>

        {userPlan === "free" && (
          <button
            type="button"
            onClick={() => handleOpenModal("plus")}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-500"
          >
            Upgrade Plan
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </section>

      {/* Monthly / Annual Toggle */}
      <div
        className="dash-enter flex items-center justify-center gap-3"
        style={{ "--dash-delay": "80ms" } as React.CSSProperties}
      >
        <span
          className={`text-xs font-medium ${
            billingInterval === "monthly"
              ? "text-neutral-900 dark:text-white"
              : "text-neutral-400 dark:text-neutral-500"
          }`}
        >
          Monthly billing
        </span>
        <button
          type="button"
          onClick={() =>
            setBillingInterval((prev) => (prev === "monthly" ? "annual" : "monthly"))
          }
          role="switch"
          aria-checked={billingInterval === "annual"}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            billingInterval === "annual" ? "bg-blue-600" : "bg-neutral-200 dark:bg-[#283548]"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              billingInterval === "annual" ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
        <div className="flex items-center gap-1.5">
          <span
            className={`text-xs font-medium ${
              billingInterval === "annual"
                ? "text-neutral-900 dark:text-white"
                : "text-neutral-400 dark:text-neutral-500"
            }`}
          >
            Annual billing
          </span>
          <span className="rounded-md border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-700 dark:border-[#283548] dark:bg-[#1e2634] dark:text-neutral-300">
            Save 20%
          </span>
        </div>
      </div>

      {/* Pricing Cards: Mobile Horizontal Swipe Carousel & Desktop Grid */}
      <div className="relative">
        <div
          className="dash-enter flex overflow-x-auto snap-x snap-mandatory gap-5 pb-4 pt-2 -mx-4 px-4 sm:mx-0 sm:px-0 md:grid md:grid-cols-2 md:overflow-visible md:pb-0 md:pt-0 xl:grid-cols-4 scrollbar-none"
          style={{ "--dash-delay": "110ms" } as React.CSSProperties}
        >
          {/* Tier 1: Free */}
          <div className="relative flex w-[82vw] max-w-[340px] shrink-0 snap-center flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs transition-all hover:shadow-md md:w-auto md:max-w-none md:shrink dark:border-[#283548] dark:bg-[#161d27]">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">Free</h3>
                {userPlan === "free" && (
                  <span className="rounded-md border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:border-[#283548] dark:bg-[#1e2736] dark:text-neutral-300">
                    Current
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Personal sandboxes and basic architecture planning.
              </p>

              <div className="mt-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                    $0
                  </span>
                  <span className="text-xs text-neutral-400">/ month</span>
                </div>
                <p className="mt-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  Free forever
                </p>
              </div>

              <ul className="mt-6 space-y-3 text-xs text-neutral-600 dark:text-neutral-300">
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                  <span>10 lifetime AI workflow requests</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                  <span>Standard models (Gemini Flash)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                  <span>Up to 5 members per project</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                  <span>Real-time collaborative canvas</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-neutral-400 mt-0.5" />
                  <span>Community support</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-neutral-100 dark:border-[#283548]">
              {userPlan === "free" ? (
                <button
                  type="button"
                  disabled
                  className="w-full cursor-default rounded-lg border border-neutral-300/60 bg-neutral-100 py-2.5 text-xs font-semibold text-neutral-500 opacity-60 dark:border-[#283548] dark:bg-[#1e2736] dark:text-neutral-400"
                >
                  Active Plan
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full cursor-default rounded-lg border border-neutral-200 bg-neutral-50 py-2.5 text-xs font-semibold text-neutral-400 dark:border-[#283548] dark:bg-[#1e2736]/40 dark:text-neutral-500"
                >
                  Included
                </button>
              )}
            </div>
          </div>

          {/* Tier 2: Plus (Recommended) */}
          <div className="relative flex w-[82vw] max-w-[340px] shrink-0 snap-center flex-col justify-between rounded-2xl border-2 border-blue-500 bg-white p-6 shadow-lg shadow-blue-500/10 transition-all hover:shadow-xl hover:shadow-blue-500/15 md:w-auto md:max-w-none md:shrink dark:border-blue-500/90 dark:bg-[#161d27] dark:shadow-blue-500/20">
            {/* Recommended Badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center rounded-md bg-blue-600 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow-sm">
                Recommended
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">Plus</h3>
                {userPlan === "plus" && (
                  <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300">
                    Current
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Expanded intelligence and larger team collaboration.
              </p>

              <div className="mt-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                    {plusPrice}
                  </span>
                  <span className="text-xs text-neutral-400">/ month</span>
                </div>
                <p className="mt-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  {billingInterval === "annual" ? "Billed annually ($19.00/yr)" : "Billed monthly"}
                </p>
              </div>

              <ul className="mt-6 space-y-3 text-xs text-neutral-600 dark:text-neutral-300">
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    3x AI limit (30 requests)
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
                  <span>Enhanced reasoning models (Gemini Pro, Sonnet)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
                  <span>Up to 10 members per project (2x limit)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
                  <span>Unlimited project canvas checkpoints</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
                  <span>Priority real-time canvas sync</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
                  <span>Standard email support</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-neutral-100 dark:border-[#283548]">
              {userPlan === "plus" ? (
                <button
                  type="button"
                  disabled
                  className="w-full cursor-default rounded-lg border border-neutral-300/60 bg-neutral-100 py-2.5 text-xs font-semibold text-neutral-500 opacity-60 dark:border-[#283548] dark:bg-[#1e2736] dark:text-neutral-400"
                >
                  Active Plan
                </button>
              ) : currentRank > 1 ? (
                <button
                  type="button"
                  disabled
                  className="w-full cursor-default rounded-lg border border-neutral-200 bg-neutral-50 py-2.5 text-xs font-semibold text-neutral-400 dark:border-[#283548] dark:bg-[#1e2736]/40 dark:text-neutral-500"
                >
                  Included
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenModal("plus")}
                  className="w-full cursor-pointer rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-xs font-semibold text-white shadow-xs transition-all hover:opacity-95 active:scale-[0.99]"
                >
                  Upgrade to Plus
                </button>
              )}
            </div>
          </div>

          {/* Tier 3: Pro */}
          <div className="relative flex w-[82vw] max-w-[340px] shrink-0 snap-center flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs transition-all hover:border-purple-300 hover:shadow-md md:w-auto md:max-w-none md:shrink dark:border-[#283548] dark:bg-[#161d27] dark:hover:border-purple-800">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">Pro</h3>
                {userPlan === "pro" && (
                  <span className="rounded-md border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/60 dark:text-purple-300">
                    Current
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                For power architects, lead engineers, and active studios.
              </p>

              <div className="mt-5">
                {userPlan === "plus" ? (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-neutral-400 line-through dark:text-neutral-500">
                        {proStandardPrice}
                      </span>
                      <span className="rounded-md border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/60 dark:text-purple-300">
                        Plus credit applied
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                        {proDiscountedPrice}
                      </span>
                      <span className="text-xs text-neutral-400">/ month</span>
                    </div>
                    <p className="mt-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                      {billingInterval === "annual"
                        ? "Billed annually ($28.90/yr — $19.00 Plus credit)"
                        : "Billed monthly ($1.99 Plus credit deducted)"}
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                        {proPrice}
                      </span>
                      <span className="text-xs text-neutral-400">/ month</span>
                    </div>
                    <p className="mt-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                      {billingInterval === "annual" ? "Billed annually ($47.90/yr)" : "Billed monthly"}
                    </p>
                  </div>
                )}
              </div>

              <ul className="mt-6 space-y-3 text-xs text-neutral-600 dark:text-neutral-300">
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-purple-500 mt-0.5" />
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    5x AI limit (50 requests)
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-purple-500 mt-0.5" />
                  <span>Flagship frontier models (Gemini Ultra, Opus)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-purple-500 mt-0.5" />
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    Up to 25 members per project
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-purple-500 mt-0.5" />
                  <span>Priority beta access to new features</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-purple-500 mt-0.5" />
                  <span>Checkpoint rollbacks &amp; branch diffs</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-purple-500 mt-0.5" />
                  <span>24/7 dedicated support</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-neutral-100 dark:border-[#283548]">
              {userPlan === "pro" ? (
                <button
                  type="button"
                  disabled
                  className="w-full cursor-default rounded-lg border border-neutral-300/60 bg-neutral-100 py-2.5 text-xs font-semibold text-neutral-500 opacity-60 dark:border-[#283548] dark:bg-[#1e2736] dark:text-neutral-400"
                >
                  Active Plan
                </button>
              ) : currentRank > 2 ? (
                <button
                  type="button"
                  disabled
                  className="w-full cursor-default rounded-lg border border-neutral-200 bg-neutral-50 py-2.5 text-xs font-semibold text-neutral-400 dark:border-[#283548] dark:bg-[#1e2736]/40 dark:text-neutral-500"
                >
                  Included
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenModal("pro")}
                  className="w-full cursor-pointer rounded-lg bg-neutral-900 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-neutral-800 dark:bg-purple-600 dark:hover:bg-purple-500"
                >
                  {userPlan === "plus" ? `Upgrade to Pro (${proDiscountedPrice}/mo)` : "Upgrade to Pro"}
                </button>
              )}
            </div>
          </div>

          {/* Tier 4: Enterprise */}
          <div className="relative flex w-[82vw] max-w-[340px] shrink-0 snap-center flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs transition-all hover:border-emerald-300 hover:shadow-md md:w-auto md:max-w-none md:shrink dark:border-[#283548] dark:bg-[#161d27] dark:hover:border-emerald-800">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">Enterprise</h3>
                {userPlan === "enterprise" && (
                  <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Current
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Custom setups, enterprise security, and dedicated infrastructure.
              </p>

              <div className="mt-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                    Custom
                  </span>
                  <span className="text-xs text-neutral-400">/ volume</span>
                </div>
                <p className="mt-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  Annual or multi-year terms
                </p>
              </div>

              <ul className="mt-6 space-y-3 text-xs text-neutral-600 dark:text-neutral-300">
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    Unlimited AI quota &amp; BYOK keys
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                  <span>Unlimited project members &amp; teams</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                  <span>Dedicated account manager &amp; custom SLA</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                  <span>SSO / SAML &amp; audit logging</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                  <span>Private VPC / On-premise deployment</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-neutral-100 dark:border-[#283548]">
              {userPlan === "enterprise" ? (
                <button
                  type="button"
                  disabled
                  className="w-full cursor-default rounded-lg border border-neutral-300/60 bg-neutral-100 py-2.5 text-xs font-semibold text-neutral-500 opacity-60 dark:border-[#283548] dark:bg-[#1e2736] dark:text-neutral-400"
                >
                  Active Plan
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenModal("enterprise")}
                  className="w-full cursor-pointer rounded-lg border border-neutral-300 bg-white py-2.5 text-xs font-semibold text-neutral-800 transition-colors hover:bg-neutral-50 dark:border-[#283548] dark:bg-[#1e2736] dark:text-neutral-200 dark:hover:bg-[#253043]"
                >
                  Contact Us
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile swipe hint */}
        <p className="mt-3 text-center text-[11px] font-medium text-neutral-400 md:hidden dark:text-neutral-500">
          &larr; Swipe to compare all plans &rarr;
        </p>
      </div>

      {/* Feature Comparison Table */}
      <section
        className="dash-enter rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-xs dark:border-[#283548] dark:bg-[#161d27]"
        style={{ "--dash-delay": "140ms" } as React.CSSProperties}
      >
        <div className="border-b border-neutral-100 p-5 sm:p-6 dark:border-[#283548]">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
            Detailed Tier Comparison
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Compare limits, quotas, and capabilities across all plans.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-600 dark:text-neutral-300">
            <thead className="border-b border-neutral-100 bg-neutral-50/70 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:border-[#283548] dark:bg-[#1e2634]/50 dark:text-neutral-400">
              <tr>
                <th className="px-5 py-3">Capability</th>
                <th className="px-4 py-3">Free</th>
                <th className="px-4 py-3 text-blue-600 dark:text-blue-400">Plus ($1.99)</th>
                <th className="px-4 py-3 text-purple-600 dark:text-purple-400">Pro ($4.99)</th>
                <th className="px-4 py-3">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-[#283548]/60">
              <tr>
                <td className="px-5 py-3 font-medium text-neutral-900 dark:text-white">
                  AI Workflow Assistant Quota
                </td>
                <td className="px-4 py-3">10 requests</td>
                <td className="px-4 py-3 font-semibold text-blue-600 dark:text-blue-400">
                  30 requests (3x)
                </td>
                <td className="px-4 py-3 font-semibold text-purple-600 dark:text-purple-400">
                  50 requests (5x)
                </td>
                <td className="px-4 py-3">Unlimited / BYOK</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-medium text-neutral-900 dark:text-white">
                  AI Reasoning Models
                </td>
                <td className="px-4 py-3">Gemini 1.5 Flash</td>
                <td className="px-4 py-3">Gemini 1.5 Pro, Sonnet</td>
                <td className="px-4 py-3">Gemini Ultra, Opus, GPT-4o</td>
                <td className="px-4 py-3">Custom / Private LLM</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-medium text-neutral-900 dark:text-white">
                  Collaborator Limit / Project
                </td>
                <td className="px-4 py-3">Up to 5 members</td>
                <td className="px-4 py-3">Up to 10 members</td>
                <td className="px-4 py-3 font-semibold text-purple-600 dark:text-purple-400">
                  Up to 25 members
                </td>
                <td className="px-4 py-3">Unlimited</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-medium text-neutral-900 dark:text-white">
                  Early Feature Access
                </td>
                <td className="px-4 py-3 text-neutral-400">No</td>
                <td className="px-4 py-3 text-neutral-400">No</td>
                <td className="px-4 py-3 font-semibold text-purple-600 dark:text-purple-400">
                  Yes (Beta First)
                </td>
                <td className="px-4 py-3">Yes</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-medium text-neutral-900 dark:text-white">
                  Canvas Checkpoints &amp; Rollback
                </td>
                <td className="px-4 py-3">Recent 3</td>
                <td className="px-4 py-3">Unlimited</td>
                <td className="px-4 py-3">Unlimited + Diffs</td>
                <td className="px-4 py-3">Unlimited + Diffs</td>
              </tr>
              <tr>
                <td className="px-5 py-3 font-medium text-neutral-900 dark:text-white">
                  Customer Support
                </td>
                <td className="px-4 py-3">Community</td>
                <td className="px-4 py-3">Email support</td>
                <td className="px-4 py-3">Priority 24/7</td>
                <td className="px-4 py-3">Dedicated Manager</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQs */}
      <section
        className="dash-enter space-y-4 max-w-3xl"
        style={{ "--dash-delay": "170ms" } as React.CSSProperties}
      >
        <div className="flex items-center gap-2 text-neutral-900 dark:text-white">
          <HelpCircle className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold">Frequently Asked Questions</h3>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-2xs dark:border-[#283548] dark:bg-[#161d27]"
            >
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="flex w-full cursor-pointer items-center justify-between p-4 text-left text-xs font-semibold text-neutral-900 transition-colors hover:bg-neutral-50 dark:text-white dark:hover:bg-[#1e2736]/50"
              >
                <span>{faq.question}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 ${
                    openFaq === idx ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  openFaq === idx ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-neutral-100 p-4 pt-3 text-xs leading-relaxed text-neutral-600 dark:border-[#283548]/70 dark:text-neutral-400">
                    {faq.answer}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Modal Dialog */}
      <BillingComingSoonModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedPlan={selectedTier}
        hasPlusCredit={userPlan === "plus"}
        proPrice={proDiscountedPrice}
      />
    </div>
  );
}
