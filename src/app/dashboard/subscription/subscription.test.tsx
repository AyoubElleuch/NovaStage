import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SubscriptionWorkspace from "./subscription-workspace";
import BillingComingSoonModal from "./billing-coming-soon-modal";

// Mock SWR to provide mock dashboard settings data
vi.mock("swr", () => ({
  default: () => ({
    data: {
      email: "engineer@novastage.com",
      profile: {
        full_name: "Lead Engineer",
        role: "developer",
        plan: "free",
      },
    },
    isLoading: false,
  }),
}));

describe("SubscriptionWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all four subscription tiers with pricing and features", () => {
    render(<SubscriptionWorkspace />);

    expect(screen.getByText(/Pricing & Account Tiers/i)).not.toBeNull();
    expect(screen.getAllByText("Free").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Plus").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pro").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Enterprise").length).toBeGreaterThan(0);

    // Check pricing
    expect(screen.getAllByText("$0").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$1.99").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$4.99").length).toBeGreaterThan(0);

    // Recommended badge for Plus
    expect(screen.getByText(/Recommended/i)).not.toBeNull();

    // Specific features
    expect(screen.getByText(/3x AI limit \(30 requests\)/i)).not.toBeNull();
    expect(screen.getByText(/Up to 10 members per project/i)).not.toBeNull();
    expect(screen.getByText(/5x AI limit \(50 requests\)/i)).not.toBeNull();
    expect(screen.getByText(/Up to 25 members per project/i)).not.toBeNull();
  });

  it("toggles between monthly and annual billing with discounted rates", () => {
    render(<SubscriptionWorkspace />);

    const switchToggle = screen.getByRole("switch");
    expect(switchToggle).not.toBeNull();

    // Initially monthly ($1.99 and $4.99)
    expect(screen.getByText("$1.99")).not.toBeNull();
    expect(screen.getByText("$4.99")).not.toBeNull();

    // Switch to annual
    fireEvent.click(switchToggle);
    expect(screen.getByText("$1.59")).not.toBeNull();
    expect(screen.getByText("$3.99")).not.toBeNull();
  });

  it("opens the coming soon modal when clicking Upgrade to Plus", () => {
    render(<SubscriptionWorkspace />);

    const upgradeButtons = screen.getAllByRole("button", { name: /Upgrade to Plus/i });
    fireEvent.click(upgradeButtons[0]);

    expect(screen.getByText(/Subscriptions Are Coming Soon/i)).not.toBeNull();
    expect(screen.getByText(/You selected the/i)).not.toBeNull();
  });

  it("expands and collapses FAQs when clicked", () => {
    render(<SubscriptionWorkspace />);

    const faqQuestion = screen.getByText(/When will live payment processing be activated\?/i);
    fireEvent.click(faqQuestion);

    expect(
      screen.getByText(/NovaStage is currently operating in early beta preview/i)
    ).not.toBeNull();
  });
});

describe("BillingComingSoonModal", () => {
  it("renders modal with email form and handles submission", () => {
    const handleClose = vi.fn();
    render(
      <BillingComingSoonModal
        isOpen={true}
        onClose={handleClose}
        selectedPlan="plus"
      />
    );

    expect(screen.getByText(/Subscriptions Are Coming Soon/i)).not.toBeNull();
    expect(screen.getByText(/Plus Plan \(\$1.99\/mo\)/i)).not.toBeNull();

    // Verify input starts empty
    const emailInput = screen.getByPlaceholderText("name@company.com") as HTMLInputElement;
    expect(emailInput.value).toBe("");

    // Enter email and submit
    fireEvent.change(emailInput, { target: { value: "subscriber@example.com" } });
    expect(emailInput.value).toBe("subscriber@example.com");

    // Submit the waitlist notification form
    const notifyButton = screen.getByRole("button", { name: /Notify Me/i });
    fireEvent.click(notifyButton);

    expect(screen.getByText(/You are on the priority launch list!/i)).not.toBeNull();
  });

  it("closes when close button is clicked", () => {
    const handleClose = vi.fn();
    render(
      <BillingComingSoonModal
        isOpen={true}
        onClose={handleClose}
        selectedPlan="pro"
      />
    );

    const closeButton = screen.getByRole("button", { name: /Close modal/i });
    fireEvent.click(closeButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

describe("SubscriptionLoading", () => {
  it("renders subscription skeleton loaders with accessible status role", async () => {
    const { default: SubscriptionLoading } = await import("./loading");
    render(<SubscriptionLoading />);

    expect(screen.getByRole("status", { name: /Loading subscription details/i })).not.toBeNull();
  });
});

describe("SubscriptionWorkspace — Tier Button Hierarchy for Pro User", () => {
  it("renders 'Included' for Plus and Free when user is Pro, and 'Active Plan' is disabled", async () => {
    const useSWRModule = await import("swr");
    vi.spyOn(useSWRModule, "default").mockReturnValue({
      data: {
        email: "pro@novastage.com",
        profile: {
          full_name: "Pro Architect",
          role: "developer",
          plan: "pro",
        },
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useSWRModule.default>);

    render(<SubscriptionWorkspace />);
    const buttons = screen.getAllByRole("button");
    const includedButtons = buttons.filter((b) => b.textContent === "Included");
    expect(includedButtons.length).toBe(2); // Free and Plus both say "Included"!
    includedButtons.forEach((btn) => {
      expect(btn.hasAttribute("disabled")).toBe(true);
    });

    const activePlanButton = buttons.find((b) => b.textContent === "Active Plan");
    expect(activePlanButton).toBeDefined();
    expect(activePlanButton?.hasAttribute("disabled")).toBe(true);
  });
});

describe("SubscriptionWorkspace — Plus User Upgrade to Pro Discount", () => {
  it("displays discounted Pro price ($3.00/mo) and Plus credit badge when user is on Plus tier", async () => {
    const useSWRModule = await import("swr");
    vi.spyOn(useSWRModule, "default").mockReturnValue({
      data: {
        email: "plus@novastage.com",
        profile: {
          full_name: "Plus Member",
          role: "developer",
          plan: "plus",
        },
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useSWRModule.default>);

    render(<SubscriptionWorkspace />);

    // Pro card displays discounted price ($3.00) and credit notice
    expect(screen.getByText("$3.00")).not.toBeNull();
    expect(screen.getByText(/Plus credit applied/i)).not.toBeNull();
    expect(screen.getByText("$4.99")).not.toBeNull();
    expect(screen.getByRole("button", { name: /Upgrade to Pro \(\$3\.00\/mo\)/i })).not.toBeNull();
  });
});
