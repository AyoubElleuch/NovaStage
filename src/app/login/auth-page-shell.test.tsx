// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import AuthPageShell from "./auth-page-shell";

afterEach(cleanup);

it("links the header logo home and provides an unmistakable link back to the interactive demo", () => {
  render(
    <AuthPageShell>
      <div>Auth Form Placeholder</div>
    </AuthPageShell>
  );

  expect(screen.getByText("Auth Form Placeholder")).toBeTruthy();
  expect(screen.getByRole("link", { name: "NovaStage home" }).getAttribute("href")).toBe("/");
  expect(screen.getByRole("link", { name: /Interactive Demo/i }).getAttribute("href")).toBe("/#live-canvas");
});
