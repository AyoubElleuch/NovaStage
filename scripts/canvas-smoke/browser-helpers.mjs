import assert from "node:assert/strict";
import { COLLABORATOR, OWNER, routeModel } from "./api-model.mjs";

/** Polls until `condition` returns something truthy, with a readable failure message. */
export async function until(condition, message, timeout = 12_000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    try { last = await condition(); if (last) return last; } catch (error) { last = error; }
    await new Promise(done => setTimeout(done, 60));
  }
  assert.fail(`Timed out: ${message}${last instanceof Error ? ` (${last.message})` : ""}`);
}

export const toasts = page => page.evaluate(() => (window.__canvasSmokeNotifications || []).map(item => `${item.tone || "info"}|${item.title}|${item.message || ""}`));
export const toastWith = (page, text) => until(async () => (await toasts(page)).find(item => item.includes(text)), `a notification containing "${text}"`);

/** Browser contexts and canvas pages wired to one API model, for the isolated browser suites. */
export function createSessions({ browser, harness }) {
  async function openContext(options = {}) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
    // The guide has its own suite; keep it out of the way of other checks.
    await context.addInitScript(() => { try { for (const id of ["smoke-user", "collab-user"]) localStorage.setItem(`novastage:canvas-guide:v1:${id}`, "dismissed"); } catch {} });
    return context;
  }
  async function openPage(context, model, { user = OWNER, query = "?live", clock } = {}) {
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    page.errors = [];
    page.on("pageerror", error => page.errors.push(error.message));
    const session = await routeModel(page, model, { origin: harness.origin, user });
    if (clock) await page.clock.install({ time: clock });
    const suffix = user.id === COLLABORATOR.id ? "&user=collab" : "";
    page.session = session;
    await page.goto(`${harness.origin}/scripts/canvas-smoke/index.html${query}${suffix}`);
    await page.getByRole("region", { name: "Interactive canvas" }).waitFor();
    return page;
  }
  return { openContext, openPage };
}
