/**
 * The single source of truth for what each plan actually enforces today. Marketing and subscription copy
 * is generated from these facts, and tests check them against the database function and project limits, so
 * a plan page cannot promise more than the app does.
 */
export type PlanId = "free" | "plus" | "pro" | "enterprise";

export const UNLIMITED = 999_999;

export const PLAN_LIMITS: Record<PlanId, { aiRequests: number; members: number }> = {
  free: { aiRequests: 10, members: 5 },
  plus: { aiRequests: 30, members: 10 },
  pro: { aiRequests: 50, members: 25 },
  enterprise: { aiRequests: UNLIMITED, members: UNLIMITED },
};

export function normalizePlan(plan?: string | null): PlanId {
  return plan === "plus" || plan === "pro" || plan === "enterprise" ? plan : "free";
}

export const getAiRequestLimit = (plan?: string | null) => PLAN_LIMITS[normalizePlan(plan)].aiRequests;
export const getMemberLimit = (plan?: string | null) => PLAN_LIMITS[normalizePlan(plan)].members;

/** Billing is not live: plans are assigned by administrators during the beta. */
export const BILLING = {
  live: false,
  note: "Paid plans can't be purchased yet. Prices are planned and may change. Limits shown are what NovaStage enforces today.",
} as const;

export const PLAN_PRICES: Record<Exclude<PlanId, "enterprise">, { monthly: string; annual: string; annualTotal: string }> = {
  free: { monthly: "$0", annual: "$0", annualTotal: "$0" },
  plus: { monthly: "$1.99", annual: "$1.59", annualTotal: "$19.00" },
  pro: { monthly: "$4.99", annual: "$3.99", annualTotal: "$47.90" },
};

const times = (plan: PlanId) => PLAN_LIMITS[plan].aiRequests / PLAN_LIMITS.free.aiRequests;

/** Only capabilities that exist and are enforced. Support levels, priority access and model tiers are not promised. */
export const PLAN_FEATURES: Record<PlanId, string[]> = {
  free: [
    `${PLAN_LIMITS.free.aiRequests} lifetime AI workflow requests`,
    `Up to ${PLAN_LIMITS.free.members} members per project`,
    "Real-time collaborative canvas",
    "Workflow and AWS architecture diagrams",
  ],
  plus: [
    `${PLAN_LIMITS.plus.aiRequests} AI workflow requests (${times("plus")}x Free)`,
    `Up to ${PLAN_LIMITS.plus.members} members per project (${PLAN_LIMITS.plus.members / PLAN_LIMITS.free.members}x Free)`,
    "Everything in Free",
  ],
  pro: [
    `${PLAN_LIMITS.pro.aiRequests} AI workflow requests (${times("pro")}x Free)`,
    `Up to ${PLAN_LIMITS.pro.members} members per project`,
    "Everything in Plus",
  ],
  enterprise: [
    "Unlimited AI workflow requests",
    "Unlimited project members",
    "Custom terms: contact us to discuss your needs",
  ],
};

/** Mentioned only as planned, never as included. */
export const PLANNED_ENTERPRISE = ["SSO / SAML", "Audit logging", "Bring-your-own model keys", "Private or on-premise deployment"] as const;

export const PLANNED_NOTE = `Planned, not available yet: ${PLANNED_ENTERPRISE.join(", ")}.`;
