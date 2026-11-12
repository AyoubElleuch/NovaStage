// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import PricingPageView from "@/components/home/pricing/pricing-page-view";

afterEach(cleanup);

it("renders public pricing plans with links back to the interactive demo and auth", () => {
  render(<PricingPageView />);

  expect(screen.getByRole("heading", { name: /Start free/i })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Free" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Plus" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Pro" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Enterprise" })).toBeTruthy();

  const demoLinks = screen
    .getAllByRole("link")
    .filter((link) => link.getAttribute("href") === "/#live-canvas");
  expect(demoLinks.length).toBeGreaterThanOrEqual(2);

  expect(screen.getByRole("link", { name: "Log in" }).getAttribute("href")).toBe("/login");
  expect(screen.getByRole("link", { name: /Get started/i }).getAttribute("href")).toBe("/signup");

  fireEvent.click(screen.getByRole("button", { name: "Annual" }));
  expect(screen.getByText("$1.59")).toBeTruthy();
});
