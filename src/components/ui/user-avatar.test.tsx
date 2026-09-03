import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React from "react";
import UserAvatar from "./user-avatar";

describe("UserAvatar Component", () => {
  it("renders user initials when no src is provided", () => {
    render(<UserAvatar name="Alice Developer" />);
    expect(screen.getByText("A")).not.toBeNull();
  });

  it("renders email initial when name is omitted", () => {
    render(<UserAvatar email="bob@example.com" />);
    expect(screen.getByText("B")).not.toBeNull();
  });

  it("renders image when src is valid", () => {
    render(
      <UserAvatar
        src="https://example.com/photo.jpg"
        name="Charlie Brown"
      />
    );
    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toBe("https://example.com/photo.jpg");
    expect(img.getAttribute("alt")).toBe("Charlie Brown");
    expect(img.getAttribute("referrerpolicy")).toBe("no-referrer");
  });

  it("gracefully falls back to initials when image loading fails", () => {
    render(
      <UserAvatar
        src="https://example.com/broken-photo.jpg"
        name="Dana Scully"
      />
    );
    const img = screen.getByRole("img");
    fireEvent.error(img);
    // After error, image is replaced by initial fallback
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("D")).not.toBeNull();
  });

  it("supports various size presets", () => {
    const { container: c1 } = render(<UserAvatar name="Test" size="sm" />);
    expect((c1.firstChild as HTMLElement)?.className).toContain("h-7");
    expect((c1.firstChild as HTMLElement)?.className).toContain("w-7");

    const { container: c2 } = render(<UserAvatar name="Test" size="lg" />);
    expect((c2.firstChild as HTMLElement)?.className).toContain("h-12");
    expect((c2.firstChild as HTMLElement)?.className).toContain("w-12");
  });
});
