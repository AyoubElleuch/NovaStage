// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import UpdatesPage from "./page";

afterEach(cleanup);
it("shows the current release first with four concise changes and preserves release history", () => {
  const { container, getByRole, queryByRole } = render(<UpdatesPage />);
  expect(container.querySelectorAll("article")).toHaveLength(3);
  fireEvent.click(getByRole("button", { name: "Load more" }));
  const articles = container.querySelectorAll("article");
  expect(articles).toHaveLength(6);
  const latest = within(articles[0]);
  expect(latest.getByText("Beta v1.1.5")).toBeTruthy();
  expect(latest.getByText("October 26, 2026")).toBeTruthy();
  expect(latest.getByText("Latest")).toBeTruthy();
  expect(latest.getByRole("heading").textContent).toBe("Clearer Generated Diagrams");
  expect(latest.getAllByRole("listitem")).toHaveLength(4);
  const previous = within(articles[1]);
  expect(previous.getByText("Beta v1.1.4")).toBeTruthy();
  expect(previous.getByText("October 26, 2026")).toBeTruthy();
  expect(previous.getByRole("heading").textContent).toBe("Bring Your Own AI to the Canvas");
  expect(within(articles[2]).getByText("Beta v1.1.3")).toBeTruthy();
  expect(within(articles[3]).getByText("Beta v1.1.2")).toBeTruthy();
  expect(within(articles[4]).getByText("Beta v1.1.1")).toBeTruthy();
  expect(within(articles[5]).getByText("Beta v1.1.0")).toBeTruthy();
  while (queryByRole("button", { name: "Load more" })) {
    const previousCount = container.querySelectorAll("article").length;
    fireEvent.click(getByRole("button", { name: "Load more" }));
    const nextCount = container.querySelectorAll("article").length;
    expect(nextCount - previousCount).toBeGreaterThan(0);
    expect(nextCount - previousCount).toBeLessThanOrEqual(3);
  }
  expect(within(container).getByText("Alpha v1.0.0")).toBeTruthy();
});
