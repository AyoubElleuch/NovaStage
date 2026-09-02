import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileNavProvider, useMobileNav } from "./mobile-nav-context";

function ConsumerComponent() {
  const { isOpen, toggle, close, setIsOpen } = useMobileNav();
  return (
    <div>
      <span data-testid="status">{isOpen ? "open" : "closed"}</span>
      <button type="button" onClick={toggle}>Toggle</button>
      <button type="button" onClick={close}>Close</button>
      <button type="button" onClick={() => setIsOpen(true)}>Open</button>
    </div>
  );
}

describe("MobileNavContext", () => {
  it("provides initial closed state and toggles open/close cleanly", () => {
    render(
      <MobileNavProvider>
        <ConsumerComponent />
      </MobileNavProvider>
    );

    const status = screen.getByTestId("status");
    expect(status.textContent).toBe("closed");

    fireEvent.click(screen.getByRole("button", { name: "Toggle" }));
    expect(status.textContent).toBe("open");

    fireEvent.click(screen.getByRole("button", { name: "Toggle" }));
    expect(status.textContent).toBe("closed");

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(status.textContent).toBe("open");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(status.textContent).toBe("closed");
  });
});
