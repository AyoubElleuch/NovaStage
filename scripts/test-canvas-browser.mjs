import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium, devices } from "playwright";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { nodes, edges, project } from "./canvas-smoke/fixtures.mjs";

// This harness mounts the actual canvas client. All APIs and realtime are mocked;
// it never logs in, connects to Supabase, or changes a real project.
const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, ".tmp/canvas-smoke");
const mocks = resolve(root, "scripts/canvas-smoke/mocks.jsx");
const server = await createServer({
  root, configFile: false, plugins: [react()],
  resolve: { alias: [
    ...["@/lib/supabase/client", "@/components/notifications/notification-provider", "@/lib/canvas/sound-effects", "next/link"].map(find => ({ find, replacement: mocks })),
    { find: "@", replacement: resolve(root, "src") },
  ] },
  optimizeDeps: { entries: ["scripts/canvas-smoke/main.jsx"] },
  server: { host: "127.0.0.1", port: 0, watch: { ignored: ["**/.next/**", "**/.tmp/**"] } },
});
await mkdir(output, { recursive: true });
await server.listen();
const origin = server.resolvedUrls.local[0].replace(/\/$/, "");
console.log(`Isolated canvas fixture: ${origin}`);
let browser;
const results = [];

async function check(label, action) {
  await action();
  results.push(label);
  console.log(`PASS ${label}`);
}
async function fixturePage(context, shared = false, empty = false) {
  const page = await context.newPage();
  const state = { nodes: empty ? [] : structuredClone(nodes), edges: empty ? [] : structuredClone(edges), mutations: [], shareToken: null };
  const errors = [];
  page.on("pageerror", error => { errors.push(error.message); console.error(error.message); });
  page.setDefaultTimeout(15_000);
  await page.route("**/*", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith("/api/")) return route.continue();
    if (url.pathname.endsWith("/share")) {
      if (request.method() === "POST") state.shareToken ||= "a".repeat(64);
      if (request.method() === "DELETE") state.shareToken = null;
      return route.fulfill({ json: { token: state.shareToken } });
    }
    assert.equal(shared, false, "public viewer must never request a private API");
    if (request.method() === "HEAD") return route.fulfill({ status: 204 });
    if (request.method() === "GET") return route.fulfill({ json: { nodes: state.nodes, edges: state.edges } });
    const body = request.postDataJSON();
    state.mutations.push(body);
    if (url.pathname.endsWith("/ai-generate")) {
      const generated = [0, 1].map(index => ({ ...structuredClone(nodes[0]), id: `ai-${index}`, title: `AI milestone ${index + 1}`, checkpoints: [], claimed_by: null, position_x: 2000 + index * 400, position_y: 1000 }));
      state.nodes.push(...generated);
      return route.fulfill({ json: { success: true, intent: "create_pipeline", nodes: generated, edges: [], requests_remaining: 9 } });
    }
    if (url.pathname.endsWith("/checkpoints")) {
      const node = state.nodes.find(node => node.id === body.node_id);
      assert.ok(node);
      if (body.action === "add") {
        const checkpoint = { id: `cp-${state.mutations.length}`, project_id: project.id, node_id: node.id, title: body.title, is_completed: false, sort_order: node.checkpoints.length };
        node.checkpoints.push(checkpoint);
        return route.fulfill({ json: { success: true, checkpoint } });
      }
      if (body.action === "toggle") node.checkpoints = node.checkpoints.map(cp => cp.id === body.checkpoint_id ? { ...cp, is_completed: body.is_completed } : cp);
      if (body.action === "delete") node.checkpoints = node.checkpoints.filter(cp => cp.id !== body.checkpoint_id);
      return route.fulfill({ json: { success: true } });
    }
    if (url.pathname.endsWith("/claim")) {
      const node = state.nodes.find(node => node.id === body.node_id);
      if (node) node.claimed_by = body.action === "release" ? null : "smoke-user";
      return route.fulfill({ json: { success: true } });
    }
    if (body.action === "update_node") state.nodes = state.nodes.map(node => node.id === body.node_id ? { ...node, ...body.updates } : node);
    else if (body.action === "create_node") state.nodes.push({ ...body, project_id: "canvas-smoke", status: "draft", sort_order: state.nodes.length, claimed_by: "smoke-user", version: 1, checkpoints: body.checkpoints || [] });
    else if (body.action === "delete_node") {
      state.nodes = state.nodes.filter(node => node.id !== body.node_id);
      state.edges = state.edges.filter(edge => edge.source_node_id !== body.node_id && edge.target_node_id !== body.node_id);
    } else if (body.action === "create_edge") {
      const edge = { ...body, id: `smoke-edge-${state.edges.length}`, project_id: "canvas-smoke" };
      state.edges.push(edge);
      return route.fulfill({ json: { success: true, edge } });
    } else if (body.action === "update_edge") {
      const edge = state.edges.find(edge => edge.id === body.edge_id);
      Object.assign(edge, body.updates);
      return route.fulfill({ json: { success: true, edge } });
    } else if (body.action === "delete_edge") state.edges = state.edges.filter(edge => edge.id !== body.edge_id);
    else throw new Error(`Smoke fixture does not implement ${body.action}`);
    return route.fulfill({ json: { success: true } });
  });
  await page.goto(`${origin}/scripts/canvas-smoke/index.html${shared ? "?shared" : empty ? "?empty" : ""}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Find on canvas" }).waitFor();
  if (empty) await page.getByRole("region", { name: "Start your canvas" }).waitFor();
  else await page.getByRole("group", { name: /^Milestone 1: Plan the release/ }).waitFor();
  return { page, state, errors };
}

try {
  browser = await chromium.launch({ headless: true });
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ["clipboard-read", "clipboard-write"] });
  const { page, state, errors } = await fixturePage(desktop);
  const canvas = page.locator("[data-canvas-viewport]");
  await check("desktop canvas renders fitted milestones, AWS resources and wires", async () => {
    assert.equal(await page.getByRole("group", { name: /^Milestone / }).count(), 3);
    assert.equal(await page.getByRole("button", { name: /^Connection from / }).count(), 3);
    const find = await page.getByRole("button", { name: "Find on canvas" }).boundingBox();
    for (const item of [page.getByRole("group", { name: /^Milestone 1:/ }), page.getByText("Production network", { exact: true })]) {
      assert.ok((await item.boundingBox()).y > find.y + find.height, "fitted nodes clear the Find control");
    }
    await page.screenshot({ path: resolve(output, "desktop.png") });
  });
  await check("search finds a checkpoint and jumps to its milestone", async () => {
    await page.getByRole("button", { name: "Find on canvas" }).click();
    await page.getByRole("combobox", { name: "Search canvas" }).fill("message queue");
    const result = page.getByRole("option", { name: /Build the platform/ });
    await result.waitFor();
    assert.equal(await page.getByRole("option").count(), 1);
    await page.getByRole("combobox", { name: "Search canvas" }).press("Enter");
    await page.getByRole("complementary", { name: "Milestone details" }).waitFor();
    await page.getByRole("button", { name: "Close details", exact: true }).click();
  });
  await check("owners can enable, copy and revoke a view-only link independently of invites", async () => {
    await page.getByRole("button", { name: "Share canvas", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Share canvas", exact: true });
    await dialog.getByRole("button", { name: "Enable view-only link", exact: true }).click();
    await page.getByRole("textbox", { name: "View-only link", exact: true }).waitFor();
    assert.equal(await page.getByRole("textbox", { name: "View-only link", exact: true }).inputValue(), `${origin}/share/${"a".repeat(64)}`);
    await dialog.getByRole("button", { name: "Copy link", exact: true }).click();
    await dialog.getByRole("button", { name: "Link copied", exact: true }).waitFor();
    await page.screenshot({ path: resolve(output, "sharing.png") });
    await dialog.getByRole("button", { name: "Disable link", exact: true }).click();
    await dialog.getByRole("button", { name: "Enable view-only link", exact: true }).waitFor();
    assert.equal(state.shareToken, null);
    await dialog.getByRole("button", { name: "Close sharing", exact: true }).click();
  });
  await check("node drag saves its final world position", async () => {
    await canvas.focus();
    await page.keyboard.press("Shift+Digit1");
    const title = page.getByRole("heading", { name: "Plan the release", exact: true });
    const box = await title.boundingBox();
    const before = state.nodes.find(node => node.id === "plan");
    const original = { x: before.position_x, y: before.position_y };
    const saved = page.waitForResponse(response => response.url().includes("/api/") && response.request().postDataJSON()?.action === "update_node");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 64, box.y + box.height / 2 + 32, { steps: 5 });
    await page.mouse.up();
    await saved;
    assert.ok(state.mutations.some(item => item.action === "update_node" && item.node_id === "plan" && (item.updates.position_x !== original.x || item.updates.position_y !== original.y)));
    await page.getByRole("button", { name: "Close details", exact: true }).click();
  });
  await check("inline rename saves once and keeps the canvas usable", async () => {
    await page.getByRole("button", { name: "Rename Build the platform", exact: true }).click();
    const input = page.getByRole("textbox", { name: "Milestone title", exact: true });
    await input.fill("Build and verify the platform");
    const saved = page.waitForResponse(response => response.url().includes("/api/") && response.request().postDataJSON()?.updates?.title === "Build and verify the platform");
    await input.press("Enter");
    await saved;
    await page.getByRole("heading", { name: "Build and verify the platform", exact: true }).waitFor();
    assert.equal(state.mutations.filter(item => item.action === "update_node" && item.updates?.title === "Build and verify the platform").length, 1);
  });
  await check("zoom controls and fit shortcuts update the actual world transform", async () => {
    const world = canvas.locator("[data-canvas-bg='true']").last();
    const before = await world.getAttribute("style");
    await page.getByTitle("Zoom In (Ctrl +)", { exact: true }).click();
    assert.notEqual(await world.getAttribute("style"), before);
    await canvas.focus();
    await page.keyboard.press("Shift+Digit1");
  });
  await check("grabbing the radar viewport does not jump and drag pans smoothly", async () => {
    const world = canvas.locator("[data-canvas-bg='true']").last();
    const before = await world.getAttribute("style");
    const radar = await page.getByTestId("minimap-viewport").boundingBox();
    await page.mouse.move(radar.x + radar.width / 2 - 10, radar.y + radar.height / 2);
    await page.mouse.down();
    const held = await world.getAttribute("style");
    const viewportPosition = style => style.match(/translate3d\(([-\d.]+)px, ([-\d.]+)px/).slice(1).map(Number);
    const beforePos = viewportPosition(before);
    const heldPos = viewportPosition(held);
    assert.ok(Math.abs(beforePos[0] - heldPos[0]) <= 1 && Math.abs(beforePos[1] - heldPos[1]) <= 1);
    await page.mouse.move(radar.x + radar.width / 2 + 8, radar.y + radar.height / 2, { steps: 4 });
    await page.mouse.up();
    assert.notEqual(await world.getAttribute("style"), held);
    const mutationsBeforeDelete = state.mutations.length;
    const overview = page.getByRole("region", { name: /^Canvas overview\./ });
    await overview.press("Delete");
    await overview.press("Backspace");
    assert.equal(state.mutations.length, mutationsBeforeDelete, "radar navigation must not delete selected nodes");
    await overview.press("Control+k");
    await page.getByRole("combobox", { name: "Search canvas" }).waitFor();
    await page.getByRole("button", { name: "Close canvas search" }).click();
    await canvas.focus();
    await page.keyboard.press("Shift+Digit1");
  });
  await check("keyboard shortcut help traps focus and closes with Escape", async () => {
    await canvas.focus();
    await page.keyboard.press("?");
    await page.getByRole("dialog", { name: "Keyboard shortcuts", exact: true }).waitFor();
    await page.screenshot({ path: resolve(output, "desktop-shortcuts.png") });
    await page.keyboard.press("Tab");
    assert.equal(await page.getByRole("region", { name: "Canvas shortcut reference" }).evaluate(element => element === document.activeElement), true);
    await page.keyboard.press("Tab");
    assert.equal(await page.getByRole("button", { name: "Close keyboard shortcuts" }).evaluate(element => element === document.activeElement), true);
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog", { name: "Keyboard shortcuts", exact: true }).count(), 0);
  });
  await page.screenshot({ path: resolve(output, "desktop-after.png") });
  assert.deepEqual(errors, [], "desktop browser errors");
  await desktop.close();

  const mobile = await browser.newContext({ ...devices["iPhone 13"] });
  const { page: phone, state: phoneState, errors: mobileErrors } = await fixturePage(mobile);
  await check("mobile controls fit the viewport and open the tools panel", async () => {
    assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await phone.getByRole("button", { name: "Canvas tools", exact: true }).click();
    await phone.getByRole("region", { name: "Canvas tools", exact: true }).waitFor();
    await phone.getByTitle("Fit to Screen", { exact: true }).click();
    await phone.screenshot({ path: resolve(output, "mobile.png") });
  });
  await check("mobile search is usable without horizontal overflow", async () => {
    await phone.getByRole("button", { name: "Find on canvas" }).click();
    await phone.getByRole("combobox", { name: "Search canvas" }).fill("eu-west-1");
    assert.equal(await phone.getByRole("option").count(), 2);
    await phone.screenshot({ path: resolve(output, "mobile-search.png") });
    assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await phone.getByRole("button", { name: "Close canvas search" }).click();
  });
  await check("mobile shortcut reference scrolls by keyboard and restores Tools focus", async () => {
    await phone.getByRole("button", { name: "Canvas tools", exact: true }).click();
    await phone.getByRole("button", { name: "Keyboard shortcuts", exact: true }).click();
    await phone.getByRole("dialog", { name: "Keyboard shortcuts", exact: true }).waitFor();
    await phone.keyboard.press("Tab");
    const content = phone.getByRole("region", { name: "Canvas shortcut reference" });
    assert.equal(await content.evaluate(element => element === document.activeElement), true);
    await content.press("End");
    await phone.waitForFunction(() => document.querySelector('[aria-label="Canvas shortcut reference"]').scrollTop > 0);
    await phone.screenshot({ path: resolve(output, "mobile-shortcuts.png") });
    await phone.keyboard.press("Escape");
    assert.equal(await phone.getByRole("button", { name: "Canvas tools", exact: true }).evaluate(element => element === document.activeElement), true);
  });
  await check("touch pinch can start on background and place a second finger on a node", async () => {
    const phoneWorld = phone.locator("[data-canvas-viewport] [data-canvas-bg='true']").last();
    const before = await phoneWorld.getAttribute("style");
    const box = await phone.getByRole("group", { name: /^Milestone 1: Plan the release/ }).boundingBox();
    const cdp = await mobile.newCDPSession(phone);
    const first = { id: 1, x: 28, y: 500 };
    const second = { id: 2, x: box.x + 20, y: box.y + 20 };
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [first] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [first, second] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...first, y: 520 }, { ...second, y: second.y - 25 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    assert.notEqual(await phoneWorld.getAttribute("style"), before);
    assert.equal(await phone.getByRole("button", { name: "Deselect milestone", exact: true }).count(), 0);
    assert.equal(phoneState.mutations.length, 0, "pinch navigation must not change a node");
    await cdp.detach();
  });
  assert.deepEqual(mobileErrors, [], "mobile browser errors");
  await check("one-finger swipes over mobile cards pan without moving or selecting a node", async () => {
    const world = phone.locator("[data-canvas-viewport] [data-canvas-bg='true']").last();
    const before = await world.getAttribute("style");
    const box = await phone.getByRole("heading", { name: "Plan the release", exact: true }).boundingBox();
    const cdp = await mobile.newCDPSession(phone);
    const touch = { id: 1, x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [touch] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...touch, x: touch.x + 50, y: touch.y + 30 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    assert.notEqual(await world.getAttribute("style"), before);
    assert.equal(phoneState.mutations.length, 0);
    assert.equal(await phone.getByRole("button", { name: "Deselect milestone" }).count(), 0);
    await cdp.detach();
  });
  await mobile.close();
  for (const [name, options] of [["desktop", { viewport: { width: 1440, height: 1000 } }], ["mobile", { ...devices["iPhone 13"] }]]) {
    const context = await browser.newContext(options);
    const { page: viewer, state: sharedState, errors: sharedErrors } = await fixturePage(context, true);
    await check(`${name} public canvas supports navigation and details without private APIs or edits`, async () => {
      assert.equal(await viewer.getByText(project.name, { exact: true }).count(), 0);
      assert.equal(await viewer.getByRole("button", { name: /Claim|Rename|Link from|Delete|Share canvas|Export canvas/ }).count(), 0);
      const world = viewer.locator("[data-canvas-viewport] [data-canvas-bg='true']").last();
      const before = await world.getAttribute("style");
      await viewer.getByRole("button", { name: "Zoom in", exact: true }).click();
      assert.notEqual(await world.getAttribute("style"), before);
      await viewer.getByRole("button", { name: "Fit canvas", exact: true }).click();
      await viewer.getByRole("heading", { name: "Plan the release", exact: true }).click();
      await viewer.getByRole("dialog", { name: "Plan the release", exact: true }).waitFor();
      await viewer.getByRole("button", { name: "Close details", exact: true }).click();
      await viewer.getByRole("button", { name: "Find on canvas", exact: true }).click();
      await viewer.getByRole("combobox", { name: "Search canvas", exact: true }).fill("Application servers");
      await viewer.getByRole("option").click();
      await viewer.getByRole("dialog", { name: "Application servers", exact: true }).waitFor();
      await viewer.screenshot({ path: resolve(output, `${name}-shared-details.png`) });
      await viewer.getByRole("button", { name: "Close details", exact: true }).click();
      await viewer.getByRole("button", { name: "Fit canvas", exact: true }).click();
      await viewer.screenshot({ path: resolve(output, `${name}-shared.png`) });
      assert.equal(sharedState.mutations.length, 0);
      assert.deepEqual(sharedErrors, []);
    });
    await context.close();
  }
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 700, height: 900 }, { width: 844, height: 390 }]) {
    const context = await browser.newContext({ ...devices["iPhone 13"], viewport, permissions: ["clipboard-read", "clipboard-write"] });
    const { page: phone, state, errors } = await fixturePage(context);
    const size = `${viewport.width}x${viewport.height}`;
    await check(`${size} navigation, tools, search and AWS palette stay reachable`, async () => {
      assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      const dock = phone.getByRole("navigation", { name: "Canvas control dock", exact: true });
      if (viewport.width < 768) {
        for (const button of await dock.getByRole("button").all()) {
          const bounds = await button.boundingBox();
          assert.ok(bounds.x >= -1 && bounds.x + bounds.width <= viewport.width + 1, `dock control fits ${size}`);
          assert.ok(bounds.width >= 43 && bounds.height >= 43, `dock control has a touch target at ${size}`);
        }
        await phone.getByRole("button", { name: "Canvas options", exact: true }).click();
        const menu = phone.getByRole("region", { name: "Canvas options", exact: true });
        await menu.getByRole("button", { name: "Copy project invite NS-TEST0", exact: true }).click();
        await menu.getByRole("button", { name: "Invite code copied NS-TEST0", exact: true }).waitFor();
        await menu.getByRole("button", { name: "Switch to dark mode", exact: true }).click();
        await menu.getByRole("button", { name: "Switch to light mode", exact: true }).waitFor();
        await menu.getByRole("button", { name: "Close canvas options", exact: true }).click();
        await phone.getByRole("button", { name: "Canvas tools", exact: true }).click();
        const tools = phone.getByRole("region", { name: "Canvas tools", exact: true });
        await tools.getByRole("button", { name: "Zoom In", exact: true }).click();
        await tools.getByRole("button", { name: "Zoom Out", exact: true }).click();
        await tools.getByRole("button", { name: "Grid: ON", exact: true }).click();
        await tools.getByRole("button", { name: "Grid: OFF", exact: true }).waitFor();
        await tools.getByRole("button", { name: "Release Pulse", exact: true }).click();
        await phone.getByRole("button", { name: "Close release pulse", exact: true }).click();
      }
      await phone.getByRole("button", { name: "Find on canvas", exact: true }).click();
      await phone.getByRole("combobox", { name: "Search canvas", exact: true }).fill("Plan the release");
      await phone.getByRole("option").click();
      if (viewport.width < 768) {
        await phone.getByRole("button", { name: "Focus selected item", exact: true }).click();
        await phone.getByRole("button", { name: "Details", exact: true }).click();
      }
      await phone.getByRole("textbox", { name: "Milestone title", exact: true }).waitFor();
      await phone.screenshot({ path: resolve(output, `mobile-${size}-details.png`) });
      await phone.getByRole("button", { name: "Close details", exact: true }).click();
      if (viewport.width < 768) await phone.getByRole("button", { name: "Deselect milestone", exact: true }).click();
      await phone.getByRole("button", { name: "AWS", exact: true }).click();
      const palette = phone.getByRole("dialog", { name: "AWS services", exact: true });
      await palette.getByRole("textbox", { name: "Search AWS services", exact: true }).fill("SES");
      await palette.getByRole("button", { name: "Add Amazon Simple Email Service to canvas", exact: true }).waitFor();
      const box = await palette.boundingBox();
      assert.ok(box.y >= -1 && box.y + box.height <= viewport.height + 1, `palette fits visible height ${size}`);
      await phone.screenshot({ path: resolve(output, `mobile-${size}-palette.png`) });
      await phone.getByRole("button", { name: "Close service palette", exact: true }).click();
      assert.equal(state.mutations.length, 0, "navigation must not change the graph");
      assert.deepEqual(errors, []);
    });
    await context.close();
  }
  const creationContext = await browser.newContext({ ...devices["iPhone 13"], viewport: { width: 320, height: 568 } });
  const { page: creator, state: created, errors: createErrors } = await fixturePage(creationContext, false, true);
  await check("small phone can start an empty canvas and save a milestone, checkpoint and AWS resource", async () => {
    await creator.screenshot({ path: resolve(output, "mobile-empty.png") });
    await creator.getByRole("region", { name: "Start your canvas" }).getByRole("button", { name: "Add Milestone", exact: true }).click();
    const title = creator.getByRole("textbox", { name: "Milestone title", exact: true });
    await title.fill("Verify phone release");
    await title.press("Enter");
    await creator.getByRole("textbox", { name: "New checkpoint", exact: true }).fill("Check loading and navigation");
    await creator.getByRole("button", { name: "Add checkpoint", exact: true }).click();
    await creator.getByText("Check loading and navigation", { exact: true }).last().waitFor();
    await creator.getByRole("button", { name: "Close details", exact: true }).click();
    await creator.getByRole("button", { name: "Focus selected item", exact: true }).click();
    await creator.getByRole("button", { name: "Deselect milestone", exact: true }).click();
    await creator.getByRole("button", { name: "AWS", exact: true }).click();
    await creator.getByRole("textbox", { name: "Search AWS services", exact: true }).fill("SES");
    await creator.getByRole("button", { name: "Add Amazon Simple Email Service to canvas", exact: true }).click();
    await creator.getByRole("textbox", { name: "Resource label", exact: true }).waitFor();
    assert.equal(created.nodes.length, 2);
    assert.equal(created.nodes[0].title, "Verify phone release");
    assert.equal(created.nodes[0].checkpoints.length, 1);
    assert.equal(created.nodes[1].aws_metadata.serviceId, "simpleemailservice");
    await creator.screenshot({ path: resolve(output, "mobile-created-resource.png") });
    assert.deepEqual(createErrors, []);
  });
  await check("small phone AI form fits above the keyboard and generated content fits on screen", async () => {
    await creator.getByRole("button", { name: "Done", exact: true }).click();
    await creator.getByRole("button", { name: "Deselect AWS resource", exact: true }).click();
    await creator.getByRole("button", { name: "Toggle AI Assistant", exact: true }).click();
    const assistant = creator.getByRole("dialog", { name: "AI assistant", exact: true });
    await assistant.getByRole("button", { name: "Workflow", exact: true }).click();
    await assistant.getByRole("button", { name: "AWS", exact: true }).click();
    await assistant.getByRole("button", { name: /Full Stack/ }).click();
    await assistant.getByRole("button", { name: "Workflow", exact: true }).click();
    assert.equal(await assistant.evaluate(element => element.scrollWidth <= element.clientWidth + 1), true);
    await creator.setViewportSize({ width: 320, height: 330 });
    await creator.waitForFunction(() => document.documentElement.style.getPropertyValue("--canvas-visible-height") === "330px");
    const keyboardBounds = await assistant.boundingBox();
    await creator.screenshot({ path: resolve(output, "mobile-ai-keyboard.png") });
    assert.ok(keyboardBounds.y >= -1 && keyboardBounds.y + keyboardBounds.height <= 331, JSON.stringify(keyboardBounds));
    await creator.setViewportSize({ width: 320, height: 568 });
    await creator.getByRole("textbox", { name: "AI prompt", exact: true }).fill("Create two milestones for a phone release");
    await creator.getByRole("button", { name: "Generate", exact: true }).click();
    await assistant.waitFor({ state: "hidden" });
    for (const name of ["AI milestone 1", "AI milestone 2"]) {
      const box = await creator.getByRole("heading", { name, exact: true }).boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= 320 && box.y >= 110 && box.y + box.height < 480, "generated cards fit the phone");
    }
    assert.deepEqual(createErrors, []);
  });
  await creationContext.close();
  await writeFile(resolve(output, "results.json"), JSON.stringify({ checks: results, errors: [] }, null, 2));
  console.log(`Canvas browser smoke passed (${results.length} checks). Screenshots: ${output}`);
} finally {
  await browser?.close();
  await server.close();
}
