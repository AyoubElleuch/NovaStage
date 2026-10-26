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
  expect(latest.getByText("Beta v1.1.4")).toBeTruthy();
  expect(latest.getByText("October 26, 2026")).toBeTruthy();
  expect(latest.getByText("Latest")).toBeTruthy();
  expect(latest.getByRole("heading").textContent).toBe("Bring Your Own AI to the Canvas");
  expect(latest.getAllByRole("listitem")).toHaveLength(4);
  const previous = within(articles[1]);
  expect(previous.getByText("Beta v1.1.3")).toBeTruthy();
  expect(previous.getByText("October 25, 2026")).toBeTruthy();
  expect(previous.getByRole("heading").textContent).toBe("View-Only Sharing & a Better Mobile Canvas");
  expect(within(articles[2]).getByText("Beta v1.1.2")).toBeTruthy();
  expect(within(articles[3]).getByText("Beta v1.1.1")).toBeTruthy();
  expect(within(articles[4]).getByText("Beta v1.1.0")).toBeTruthy();
});
