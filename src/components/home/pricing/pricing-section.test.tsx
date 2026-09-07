import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PricingSection from "./pricing-section";

describe("PricingSection", () => {
  it("shows all dashboard tiers with their monthly limits", () => {
    render(<PricingSection />);

    expect(screen.getByRole("heading", { name: "Free" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Plus" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Pro" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Enterprise" })).not.toBeNull();
    expect(screen.getByText("$1.99")).not.toBeNull();
    expect(screen.getByText("$4.99")).not.toBeNull();
    expect(screen.getByText("3x AI limit (30 requests)")).not.toBeNull();
    expect(screen.getByText("5x AI limit (50 requests)")).not.toBeNull();
    expect(screen.getByText("Up to 25 members per project")).not.toBeNull();
  });

  it("switches to the published annual rates", () => {
    render(<PricingSection />);

    fireEvent.click(screen.getByRole("button", { name: "Annual" }));

    expect(screen.getByText("$1.59")).not.toBeNull();
    expect(screen.getByText("$3.99")).not.toBeNull();
    expect(screen.getByText("$1.99 / month").tagName).toBe("DEL");
    expect(screen.getByText("$4.99 / month").tagName).toBe("DEL");
    expect(screen.getByText("Billed annually ($19.00/yr)")).not.toBeNull();
    expect(screen.getByText("Billed annually ($47.90/yr)")).not.toBeNull();
  });

  it("opens the shared billing preview modal instead of navigating", () => {
    render(<PricingSection />);

    fireEvent.click(screen.getAllByRole("button", { name: /Join the beta/i })[0]);

    expect(screen.getByRole("dialog", { name: /Subscriptions Are Coming Soon/i })).not.toBeNull();
    expect(screen.getByText(/Plus Plan \(\$1\.99\/mo\)/i)).not.toBeNull();
  });
});