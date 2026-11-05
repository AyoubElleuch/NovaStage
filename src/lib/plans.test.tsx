// @vitest-environment jsdom
import React from "react";
import { readFileSync } from "node:fs";
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import PricingSection from "@/components/home/pricing/pricing-section";
import { getMaxMembersForPlan } from "@/lib/projects";
import { BILLING, PLAN_FEATURES, PLAN_LIMITS, getAiRequestLimit, normalizePlan } from "./plans";

afterEach(cleanup);

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

it("shows every published feature on the landing page and says billing is not live", () => {
  render(<PricingSection />);
  for (const features of Object.values(PLAN_FEATURES)) for (const feature of features) expect(screen.getAllByText(feature).length).toBeGreaterThan(0);
  expect(BILLING.live).toBe(false);
  expect(screen.getByText(/can't be purchased yet/)).toBeTruthy();
  expect(screen.getByRole("link", { name: "Create free account" }).getAttribute("href")).toBe("/signup");
});

it("does not promise capabilities the app does not have", () => {
  const surfaces = ["src/components/home/pricing/pricing-section.tsx", "src/lib/plans.ts", "README.md"].map((file) => readFileSync(file, "utf8")).join("\n");
  const unavailable = /BYOK keys|Gemini Ultra|Opus|Sonnet|24\/7|branch diffs|checkpoint rollbacks|Priority real-time|priority launch list/i;
  const offending = surfaces.split("\n").filter((line) => unavailable.test(line) && !/Bring-your-own|Planned/.test(line));
  expect(offending).toEqual([]);
});
