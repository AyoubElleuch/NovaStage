// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Dropdown from "./dropdown";

afterEach(cleanup);
const options = [{ value: "draft", label: "Planned" }, { value: "blocked", label: "Blocked", disabled: true }, { value: "completed", label: "Complete" }];

it("navigates enabled options and commits with Space while keeping trigger focus", () => {
  const change = vi.fn();
  render(<Dropdown aria-label="Status" value="draft" options={options} onChange={change} />);
  const trigger = screen.getByRole("combobox", { name: "Status" });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "Enter" });
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  fireEvent.keyDown(trigger, { key: " " });
  expect(change).toHaveBeenCalledWith("completed");
  expect(screen.queryByRole("listbox")).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

it("dismisses without changing the value on Escape and outside pointer", () => {
  const change = vi.fn();
  render(<Dropdown aria-label="Status" value="draft" options={options} onChange={change} />);
  const trigger = screen.getByRole("combobox");
  fireEvent.click(trigger);
  fireEvent.keyDown(trigger, { key: "Escape" });
  expect(screen.queryByRole("listbox")).toBeNull();
  fireEvent.click(trigger);
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole("listbox")).toBeNull();
  expect(change).not.toHaveBeenCalled();
});

it("selects by pointer and skips disabled choices with ArrowUp", () => {
  const change = vi.fn();
  render(<Dropdown aria-label="Status" value="completed" options={options} onChange={change} />);
  const trigger = screen.getByRole("combobox");
  fireEvent.keyDown(trigger, { key: "ArrowUp" });
  fireEvent.keyDown(trigger, { key: "ArrowUp" });
  fireEvent.keyDown(trigger, { key: "Enter" });
  expect(change).toHaveBeenLastCalledWith("draft");
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole("option", { name: "Blocked" }));
  expect(change).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("option", { name: "Planned" }));
  expect(screen.queryByRole("listbox")).toBeNull();
});
