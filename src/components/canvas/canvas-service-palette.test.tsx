// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CanvasServicePalette from "./canvas-service-palette";

afterEach(cleanup);
it.each([["SES", "simpleemailservice"], ["ALB", "elb"], ["Amazon Simple Queue Service", "sqs"]])("adds the intended first result for %s", (query, expected) => {
  const add = vi.fn();
  render(<CanvasServicePalette isOpen onClose={vi.fn()} onAddService={add} />);
  const search = screen.getByRole("textbox", { name: "Search AWS services" });
  fireEvent.change(search, { target: { value: query } });
  fireEvent.keyDown(search, { key: "Enter" });
  expect(add).toHaveBeenCalledWith(expected);
  expect(screen.getAllByRole("button", { name: "Clear service search" })).toHaveLength(1);
});
