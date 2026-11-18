import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { getMaxMembersForPlan } from "@/lib/projects";
import { PLAN_LIMITS, getAiRequestLimit, normalizePlan } from "./plans";

it("matches the limits enforced by the database quota function", () => {
  const sql = readFileSync("supabase/migrations/020_tier_quotas_and_perks.sql", "utf8");
  const limit = (plan: string) => Number(new RegExp(`v_plan = '${plan}' then\\s+v_max := (\\d+)`).exec(sql)?.[1]);
  expect(limit("pro")).toBe(PLAN_LIMITS.pro.aiRequests);
  expect(limit("plus")).toBe(PLAN_LIMITS.plus.aiRequests);
  expect(Number(/else\s+v_max := (\d+)/.exec(sql)?.[1])).toBe(PLAN_LIMITS.free.aiRequests);
  expect(limit("enterprise")).toBe(PLAN_LIMITS.enterprise.aiRequests);
});

it("shares one definition of member and request limits across the app", () => {
  for (const plan of ["free", "plus", "pro", "enterprise"] as const) {
    expect(getMaxMembersForPlan(plan)).toBe(PLAN_LIMITS[plan].members);
    expect(getAiRequestLimit(plan)).toBe(PLAN_LIMITS[plan].aiRequests);
  }
  expect(normalizePlan("unknown")).toBe("free");
});

