import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, devices } from "playwright";
import { startHarness, root } from "./canvas-smoke/harness.mjs";
import { nodes, edges } from "./canvas-smoke/fixtures.mjs";

// First-project usability checks against the real canvas client with disposable, mocked APIs.
const output = resolve(root, ".tmp/usability");
await mkdir(output, { recursive: true });
const harness = await startHarness();
const page_url = `${harness.origin}/scripts/canvas-smoke/index.html`;
const browser = await chromium.launch({ headless: true });
let passed = 0;
const check = async (label, action) => { await action(); passed += 1; console.log(`PASS ${label}`); };

async function open(context, query = "") {
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const state = { nodes: query.includes("empty") ? [] : structuredClone(nodes), edges: query.includes("empty") ? [] : structuredClone(edges) };
  await page.route("**/*", route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== harness.origin) return route.abort();
    if (!url.pathname.startsWith("/api/")) return route.continue();
    if (request.method() === "HEAD") return route.fulfill({ status: 204 });
    if (request.method() === "GET") return route.fulfill({ json: state });
    const body = request.postDataJSON();
    if (body.action === "create_node") state.nodes.push({ ...body, project_id: "canvas-smoke", description: "", status: "draft", width: 280, height: 170, color: "default", sort_order: state.nodes.length, claimed_by: "smoke-user", version: 1, checkpoints: [], node_type: "milestone" });
    return route.fulfill({ json: { success: true } });
  });
  await page.goto(page_url + query);
  await page.getByRole("region", { name: "Interactive canvas" }).waitFor();
  page.errors = errors;
  return page;
}
const inViewport = async (page, locator) => {
  const box = await locator.boundingBox();
  const size = page.viewportSize();
  assert.ok(box, "element is rendered");
  assert.ok(box.x >= -0.5 && box.y >= -0.5 && box.x + box.width <= size.width + 0.5 && box.y + box.height <= size.height + 0.5, `element fits the ${size.width}x${size.height} viewport: ${JSON.stringify(box)}`);
  return box;
};
const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  await check("empty canvas explains each starting action and opens the guide on request", async () => {
    const page = await open(desktop, "?empty");
    const start = page.getByRole("region", { name: "Start your canvas" });
    for (const text of ["A step with checkpoints to tick off", "Place and connect architecture parts", "Draft a workflow or AWS diagram"]) await start.getByText(text).waitFor();
    assert.equal(await page.locator(".canvas-guide").count(), 0, "guide does not crowd an empty canvas on first visit");
    await start.getByRole("button", { name: "How it works" }).click();
    const guide = page.locator(".canvas-guide");
    await guide.waitFor();
    assert.equal(await start.count(), 0, "empty state yields to the guide instead of overlapping it");
    const seen = [];
    for (let step = 0; step < 5; step += 1) {
      seen.push(await guide.getByRole("heading").textContent());
      await guide.getByRole("button", { name: step === 4 ? "Got it" : "Next" }).click();
    }
    assert.equal(new Set(seen).size, 5);
    for (const word of ["Milestones", "Checkpoints", "Connections", "Claim", "Find your way"]) assert.ok(seen.some(title => title.includes(word)), `guide covers ${word}`);
    await guide.waitFor({ state: "detached" });
    await start.waitFor();
    await page.screenshot({ path: `${output}/desktop-empty.png` });
    await page.close();
  });

  await check("first visit shows a dismissible guide that stays clear of the HUD, dock and cards, and stays dismissed", async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await open(context);
    const guide = page.locator(".canvas-guide");
    await guide.waitFor();
    await page.screenshot({ path: `${output}/desktop-guide.png` });
    const box = await inViewport(page, guide);
    for (const card of await page.getByRole("group").all()) assert.ok(!overlaps(box, await card.boundingBox()), "guide does not cover the diagram on first fit");
    const dockBox = await page.getByRole("navigation", { name: "Canvas control dock" }).boundingBox();
    const radarBox = await page.getByRole("region", { name: /Canvas overview/ }).boundingBox();
    assert.ok(!overlaps(box, dockBox), "guide does not overlap the dock");
    assert.ok(!overlaps(box, radarBox), "guide does not overlap the radar");
    for (const name of ["Export canvas", "Share canvas", "Copy invite code"]) assert.ok(!overlaps(box, await page.getByRole("button", { name }).boundingBox()), `guide does not overlap ${name}`);
    await page.keyboard.press("Control+k");
    assert.equal(await guide.count(), 0, "guide steps aside while search is open");
    await page.keyboard.press("Escape");
    await guide.waitFor();
    await guide.getByRole("button", { name: "Close canvas guide" }).click();
    await guide.waitFor({ state: "detached" });
    await page.reload();
    await page.getByRole("region", { name: "Interactive canvas" }).waitFor();
    await page.waitForTimeout(400);
    assert.equal(await page.locator(".canvas-guide").count(), 0, "dismissal persists after reload");
    await page.getByRole("button", { name: "Canvas guide", exact: true }).click();
    await page.locator(".canvas-guide").waitFor();
    assert.equal(await page.getByRole("button", { name: "Canvas guide", exact: true }).getAttribute("aria-pressed"), "true");
    await page.keyboard.press("Escape");
    await page.close();
    await context.close();
  });

  await check("connecting shows where you are, can be cancelled, and the notebook no longer looks like help", async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => localStorage.setItem("novastage:canvas-guide:v1:smoke-user", "dismissed"));
    const page = await open(context);
    await page.getByRole("group", { name: /Milestone 1: Plan the release/ }).hover();
    await page.getByRole("button", { name: "Link from right port of Plan the release" }).click();
    const hint = page.getByRole("status").filter({ hasText: "Connecting from" });
    await hint.waitFor();
    assert.match(await hint.textContent(), /Plan the release/);
    await page.keyboard.press("Escape");
    await hint.waitFor({ state: "detached" });
    await page.getByRole("group", { name: /Milestone 1: Plan the release/ }).hover();
    await page.getByRole("button", { name: "Link from right port of Plan the release" }).click();
    await hint.getByRole("button", { name: "Cancel" }).click();
    await hint.waitFor({ state: "detached" });
    assert.equal(await page.getByRole("button", { name: "Open project notebook" }).locator("svg.lucide-book-open").count(), 1);
    const unnamed = await page.$$eval("nav[aria-label='Canvas control dock'] button", buttons => buttons.filter(b => !(b.getAttribute("aria-label") || b.textContent.trim())).length);
    assert.equal(unnamed, 0, "every dock button has an accessible name");
    await page.close();
    await context.close();
  });

  for (const [label, options] of [["390x844 phone", { ...devices["iPhone 13"] }], ["320x568 small phone", { viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true }]]) {
    await check(`${label}: guide uses touch wording, fits, and primary targets are at least 44px`, async () => {
      const context = await browser.newContext(options);
      const page = await open(context);
      const guide = page.locator(".canvas-guide");
      await guide.waitFor();
      await inViewport(page, guide);
      assert.match(await guide.locator("p[aria-live]").textContent(), /Tap /);
      for (const name of ["Close canvas guide", "Next", "Previous tip"]) {
        const box = await guide.getByRole("button", { name }).boundingBox();
        assert.ok(box.width >= 43.5 && box.height >= 43.5, `${name} is ${box.width}x${box.height}`);
      }
      for (const name of ["Pan canvas", "Select and move nodes", "Add milestone", "AWS Services", "Canvas tools"]) {
        const box = await page.getByRole("button", { name }).first().boundingBox();
        assert.ok(box.width >= 43.5 && box.height >= 43.5, `${name} is ${box.width}x${box.height}`);
      }
      const dock = await page.getByRole("navigation", { name: "Canvas control dock" }).boundingBox();
      assert.ok(dock.x >= 0 && dock.x + dock.width <= page.viewportSize().width, "dock stays on screen");
      await page.screenshot({ path: `${output}/${label.split(" ")[0]}-guide.png` });
      await guide.getByRole("button", { name: "Close canvas guide" }).click();
      await page.getByRole("button", { name: "Canvas tools" }).first().click();
      await page.getByRole("button", { name: "Canvas guide", exact: true }).waitFor();
      await page.close();
      await context.close();
    });
  }

  await check("keyboard users can reach the guide controls in order and dismiss with Escape", async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await open(context);
    const guide = page.locator(".canvas-guide");
    await guide.waitFor();
    await guide.getByRole("button", { name: "Next" }).focus();
    await page.keyboard.press("Enter");
    assert.match(await guide.getByRole("heading").textContent(), /Checkpoints/);
    await page.keyboard.press("Escape");
    await guide.waitFor({ state: "detached" });
    await page.close();
    await context.close();
  });

  console.log(`Usability browser checks passed (${passed}). Screenshots: ${output}`);
} finally {
  await browser.close();
  await harness.close();
}
