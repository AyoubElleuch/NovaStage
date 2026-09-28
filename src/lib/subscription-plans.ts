export type SubscriptionPlan = "free" | "plus" | "pro" | "enterprise";

const AI_REQUEST_LIMITS: Record<SubscriptionPlan, number> = {
  free: 10,
  plus: 30,
  pro: 50,
  enterprise: 999999,
};

export function getAiRequestLimit(plan: string | null | undefined): number {
  return AI_REQUEST_LIMITS[plan as SubscriptionPlan] ?? AI_REQUEST_LIMITS.free;
}
