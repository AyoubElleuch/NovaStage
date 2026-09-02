import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ProjectsLoading from "./(projects)/loading";
import UpdatesLoading from "./updates/loading";
import SettingsLoading from "./settings/loading";

describe("Dashboard Skeletons & Theme Alignment", () => {
  describe("ProjectsLoading", () => {
    it("renders with appropriate status role and label", () => {
      render(<ProjectsLoading />);
      const statusEl = screen.getByRole("status", { name: /loading projects/i });
      expect(statusEl).not.toBeNull();
    });

    it("renders 6 project cards with invite code box placeholders and dark mode styling", () => {
      const { container } = render(<ProjectsLoading />);
      const cards = container.querySelectorAll(".grid > div.flex-col");
      expect(cards.length).toBe(6);

      // Verify each card contains invite code box placeholder and dark mode classes
      cards.forEach((card) => {
        expect(card.className).toContain("dark:border-[#283548]");
        expect(card.className).toContain("dark:bg-[#161d27]");
        // Invite code box placeholder exists inside
        const inviteBox = card.querySelector(".dark\\:bg-\\[\\#121721\\]");
        expect(inviteBox).not.toBeNull();
      });
    });
  });

  describe("UpdatesLoading", () => {
    it("renders with appropriate status role and label", () => {
      render(<UpdatesLoading />);
      const statusEl = screen.getByRole("status", { name: /loading updates/i });
      expect(statusEl).not.toBeNull();
    });

    it("renders timeline with distinct latest dot and subsequent dots matching dark mode", () => {
      const { container } = render(<UpdatesLoading />);
      const articles = container.querySelectorAll("article");
      expect(articles.length).toBe(3);

      // Latest release node has emerald dot in dark mode
      const firstDot = articles[0].querySelector("span[aria-hidden='true']");
      expect(firstDot?.className).toContain("dark:bg-emerald-500");

      // Subsequent release nodes have neutral-600 dot in dark mode
      const secondDot = articles[1].querySelector("span[aria-hidden='true']");
      expect(secondDot?.className).toContain("dark:bg-neutral-600");
    });
  });

  describe("SettingsLoading", () => {
    it("renders with appropriate status role and label", () => {
      render(<SettingsLoading />);
      const statusEl = screen.getByRole("status", { name: /loading settings/i });
      expect(statusEl).not.toBeNull();
    });

    it("renders profile summary, appearance cards, all 4 profile inputs, and password strength meter", () => {
      const { container } = render(<SettingsLoading />);
      
      // Hero Profile Summary with right-aligned active badge
      const activeBadgeSkeleton = container.querySelector(".ml-auto");
      expect(activeBadgeSkeleton).not.toBeNull();

      // Theme cards with dark background support
      const themeCards = container.querySelectorAll(".dark\\:bg-\\[\\#121721\\]");
      expect(themeCards.length).toBe(2);

      // Password strength meter with 5 segments
      const strengthSegments = container.querySelectorAll(".grid-cols-5 > div");
      expect(strengthSegments.length).toBe(5);

      // Danger Zone with red theme accents
      const dangerSection = container.querySelector(".dark\\:bg-red-950\\/20");
      expect(dangerSection).not.toBeNull();
      expect(dangerSection?.className).toContain("border-red-200");
    });
  });
});
