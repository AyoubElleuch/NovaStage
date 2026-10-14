// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, render, within } from "@testing-library/react";
import UpdatesPage from "./page";

afterEach(cleanup);
it("shows the current release first with four concise changes and preserves release history", () => {
  const { container } = render(<UpdatesPage />);
  const articles = container.querySelectorAll("article");
  const latest = within(articles[0]);
  expect(latest.getByText("Beta v1.1.1")).toBeTruthy();
  expect(latest.getByText("October 14, 2026")).toBeTruthy();
  expect(latest.getByRole("heading").textContent).toBe("Focused on Canvas Usability, Connections & UI Polish");
  expect(latest.getAllByRole("listitem")).toHaveLength(4);
  expect(within(articles[1]).getByText("Beta v1.1.0")).toBeTruthy();
});
