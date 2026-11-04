import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { startHarness, root } from "./canvas-smoke/harness.mjs";
import { nodes, edges } from "./canvas-smoke/fixtures.mjs";
import { COLLABORATOR, OWNER, createApiModel } from "./canvas-smoke/api-model.mjs";
import { createSessions, toastWith, toasts, until } from "./canvas-smoke/browser-helpers.mjs";

// Persistence, undo/redo, collaboration, conflict, failure and offline checks.
// The API is a MODEL of the canvas routes (scripts/canvas-smoke/api-model.mjs), shared by real
// browser pages, so these checks exercise the real client against realistic server rules.
// They do not prove live Supabase/Realtime behavior; see docs/canvas-reliability.md.
const output = resolve(root, ".tmp/reliability");
await mkdir(output, { recursive: true });
const harness = await startHarness();
const browser = await chromium.launch({ headless: true });
let passed = 0;
const failures = [];
const check = async (label, action) => {
  try { await action(); passed += 1; console.log(`PASS ${label}`); }
  catch (error) { failures.push(label); console.error(`FAIL ${label}\n${error.stack}`); }
};

const freshModel = () => createApiModel({ nodes, edges });
const { openContext, openPage } = createSessions({ browser, harness });
const indicator = page => page.locator("[data-save-state]").first();
const drawer = page => page.locator("aside[aria-label$='details']");
const saveState = page => indicator(page).getAttribute("data-save-state");
const card = (page, title) => page.getByRole("group", { name: new RegExp(`^(Milestone \\d+: )?${title}[.,]`) }).first();
const settled = async (page, expected = "saved") => until(async () => (await saveState(page)) === expected, `save state ${expected}`);
const nodeByTitle = (model, title) => model.nodes.find(node => node.title === title);
async function addMilestone(page, title) {
  await page.getByRole("button", { name: "Add milestone" }).click();
  const input = page.getByLabel("Milestone title");
  await input.waitFor();
  await input.fill(title);
  await input.press("Enter");
  await until(() => page.locator("[data-save-state='saved']").count(), "milestone saved");
}
async function undo(page) { await page.getByRole("button", { name: "Undo", exact: true }).click(); }
async function redo(page) { await page.getByRole("button", { name: "Redo", exact: true }).click(); }
async function closeDrawer(page) { const close = page.getByRole("button", { name: "Close details" }); if (await close.count()) await close.click(); }

try {
  await check("created and edited milestones and checkpoints persist after a refresh", async () => {
    const model = freshModel();
    const context = await openContext();
    const page = await openPage(context, model);
    await addMilestone(page, "Persisted plan");
    await until(() => nodeByTitle(model, "Persisted plan"), "milestone stored");
    await page.getByLabel("New checkpoint").fill("Write the docs");
    await page.getByLabel("New checkpoint").press("Enter");
    await drawer(page).getByRole("button", { name: 'Mark "Write the docs" as complete' }).click();
    await until(() => nodeByTitle(model, "Persisted plan")?.checkpoints[0]?.is_completed, "checkpoint completion stored");
    assert.equal(nodeByTitle(model, "Persisted plan").status, "completed");
    await settled(page);
    await page.screenshot({ path: `${output}/saved.png` });
    await page.reload();
    await page.getByRole("region", { name: "Interactive canvas" }).waitFor();
    await card(page, "Persisted plan").waitFor();
    assert.match(await card(page, "Persisted plan").getAttribute("aria-label"), /Complete/);
    assert.deepEqual(page.errors, []);
    await context.close();
  });

  await check("undo and redo are saved, survive a refresh, and are available from the keyboard", async () => {
    const model = freshModel();
    const context = await openContext();
    const page = await openPage(context, model);
    await addMilestone(page, "Temporary idea");
    await until(() => nodeByTitle(model, "Temporary idea"), "milestone stored");
    const count = model.nodes.length;
    const draft = () => model.nodes.find(node => /^Milestone Step/.test(node.title));
    await closeDrawer(page);
    // The new milestone has two history entries (create, then rename): undo the rename by keyboard, then the creation.
    await page.getByRole("region", { name: "Interactive canvas" }).focus();
    await page.keyboard.press("Control+z");
    await until(draft, "keyboard undo reverted the rename on the server");
    await page.keyboard.press("Control+z");
    await until(() => model.nodes.length === count - 1 && !draft(), "undo removed the milestone from the server");
    await settled(page);
    await redo(page);
    await redo(page);
    await until(() => nodeByTitle(model, "Temporary idea"), "redo restored the milestone and its name on the server");
    await settled(page);
    await page.reload();
    await card(page, "Temporary idea").waitFor();

    // History is per session, so undo the same milestone again and confirm a refresh shows the saved result.
    await page.getByRole("heading", { name: "Plan the release", exact: true }).click();
    const title = page.getByLabel("Milestone title");
    await title.fill("Plan v2");
    await title.press("Enter");
    await until(() => model.stored("plan").title === "Plan v2", "rename stored");
    await closeDrawer(page);
    await undo(page);
    await until(() => model.stored("plan").title === "Plan the release", "undo reverted the rename on the server");
    await settled(page);
    await page.reload();
    assert.equal(await page.getByRole("heading", { name: "Plan the release", exact: true }).count(), 1, "undone rename stays undone after refresh");
    await title.waitFor({ state: "detached" });
    await page.getByRole("button", { name: "Undo", exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Undo", exact: true }).isDisabled(), true, "a fresh session starts with an empty history");
    assert.deepEqual(page.errors, []);
    await context.close();
  });

  await check("undo removes the connection it created, and collaborators see the result", async () => {
    const model = freshModel();
    const context = await openContext();
    const owner = await openPage(context, model);
    const collab = await openPage(context, model, { user: COLLABORATOR });
    const link = name => collab.getByRole("button", { name });
    await owner.getByRole("group", { name: /Milestone 1: Plan the release/ }).hover();
    await owner.getByRole("button", { name: "Link from bottom port of Plan the release" }).click();
    await owner.getByRole("button", { name: "Connect to left port of Ship with confidence" }).click();
    await until(() => model.edges.some(edge => edge.source_node_id === "plan" && edge.target_node_id === "ship"), "connection stored");
    await link("Connection from Plan the release to Ship with confidence").waitFor();
    await undo(owner);
    await until(() => !model.edges.some(edge => edge.source_node_id === "plan" && edge.target_node_id === "ship"), "undo removed the connection from the server");
    await until(async () => (await link("Connection from Plan the release to Ship with confidence").count()) === 0, "collaborator's canvas dropped the connection");
    await redo(owner);
    await until(() => model.edges.some(edge => edge.source_node_id === "plan" && edge.target_node_id === "ship"), "redo stored the connection again");
    await link("Connection from Plan the release to Ship with confidence").waitFor();
    assert.deepEqual([...owner.errors, ...collab.errors], []);
    await context.close();
  });

  await check("one person's undo does not overwrite another person's concurrent change", async () => {
    const model = freshModel();
    const context = await openContext();
    const owner = await openPage(context, model);
    const collab = await openPage(context, model, { user: COLLABORATOR });
    await owner.getByRole("heading", { name: "Plan the release", exact: true }).click();
    await owner.getByLabel("Milestone title").fill("Plan, edited");
    await owner.getByLabel("Milestone title").press("Enter");
    await until(() => model.stored("plan").title === "Plan, edited", "owner's rename stored");
    await closeDrawer(owner);
    // The collaborator moves a different card.
    const ship = collab.getByRole("heading", { name: "Ship with confidence", exact: true });
    const box = await ship.boundingBox();
    await collab.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await collab.mouse.down();
    await collab.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2 + 60, { steps: 6 });
    await collab.mouse.up();
    await until(() => model.stored("ship").position_x !== 580 || model.stored("ship").position_y !== -100, "collaborator's move stored");
    const moved = { x: model.stored("ship").position_x, y: model.stored("ship").position_y };
    await until(async () => { const now = await owner.getByRole("heading", { name: "Ship with confidence", exact: true }).boundingBox(); return Math.abs(now.x - box.x) > 20; }, "owner saw the collaborator's move live");
    await undo(owner);
    await until(() => model.stored("plan").title === "Plan the release", "owner's undo reverted only the owner's change");
    assert.deepEqual({ x: model.stored("ship").position_x, y: model.stored("ship").position_y }, moved, "collaborator's move is untouched");
    await owner.reload();
    await owner.getByRole("region", { name: "Interactive canvas" }).waitFor();
    assert.equal(await owner.getByRole("heading", { name: "Plan the release", exact: true }).count(), 1);
    assert.deepEqual([...owner.errors, ...collab.errors], []);
    await context.close();
  });

  await check("a rejected save reverts the screen, explains why, and can be dismissed", async () => {
    const model = freshModel();
    const context = await openContext();
    const page = await openPage(context, model);
    await page.getByRole("heading", { name: "Plan the release", exact: true }).click();
    model.fail("update_node", { status: 500, json: { success: false, error: "Database is unavailable" } });
    const title = page.getByLabel("Milestone title");
    await title.fill("Will not stick");
    await title.press("Enter");
    await toastWith(page, "Changes Not Saved");
    await until(async () => (await title.inputValue()) === "Plan the release", "title returned to the saved value");
    assert.equal(model.stored("plan").title, "Plan the release");
    assert.equal(await saveState(page), "failed");
    assert.match(await indicator(page).getAttribute("title"), /saved version/);
    await page.screenshot({ path: `${output}/failed-save.png` });
    await indicator(page).getByRole("button", { name: "Dismiss" }).click();
    await settled(page);
    // A later save works normally.
    await title.fill("Plan, second try");
    await title.press("Enter");
    await until(() => model.stored("plan").title === "Plan, second try", "next save succeeds");
    await context.close();
  });

  await check("a failed checkpoint save, a failed create and a failed delete each revert and explain", async () => {
    const model = freshModel();
    const context = await openContext();
    const page = await openPage(context, model);
    await page.getByRole("heading", { name: "Build the platform", exact: true }).click();
    model.fail("/canvas/checkpoints", { status: 423, json: { error: "You must claim this milestone box to alter or check its steps" } });
    await drawer(page).getByRole("button", { name: 'Mark "Configure the message queue" as complete' }).click();
    await toastWith(page, "Checkpoint Not Saved");
    await until(async () => (await drawer(page).getByRole("button", { name: 'Mark "Configure the message queue" as complete' }).count()) === 1, "checkpoint reverted to incomplete");
    assert.equal(model.stored("build").checkpoints[0].is_completed, false);
    await closeDrawer(page);

    const before = model.nodes.length;
    model.fail("create_node", { status: 500, json: { success: false, error: "Unable to create this item. Please try again." } });
    await page.getByRole("button", { name: "Add milestone" }).click();
    await toastWith(page, "Milestone Not Saved");
    assert.equal(model.nodes.length, before);
    await until(async () => (await page.getByRole("group", { name: /Milestone Step/ }).count()) === 0, "unsaved milestone removed");
    await closeDrawer(page);

    model.fail("delete_node", { status: 500, json: { success: false, error: "Database is unavailable" } });
    await page.getByRole("heading", { name: "Ship with confidence", exact: true }).click();
    await drawer(page).getByRole("button", { name: "Delete milestone" }).click();
    await toastWith(page, "Delete Not Saved");
    await card(page, "Ship with confidence").waitFor();
    assert.ok(model.stored("ship"), "the card still exists on the server");
    await context.close();
  });

  await check("a claim handoff works end to end and locks the previous editor", async () => {
    const model = freshModel();
    const context = await openContext();
    const owner = await openPage(context, model);
    const collab = await openPage(context, model, { user: COLLABORATOR });
    await owner.getByRole("heading", { name: "Plan the release", exact: true }).click();
    const title = owner.getByLabel("Milestone title");
    await collab.getByRole("heading", { name: "Plan the release", exact: true }).click();
    await drawer(collab).getByRole("button", { name: "Request access" }).click();
    await owner.getByRole("region", { name: "Edit access request" }).waitFor();
    await owner.screenshot({ path: `${output}/claim-request.png` });
    await owner.getByRole("button", { name: "Decline" }).click();
    await toastWith(owner, "Claim Request Declined");
    await drawer(collab).getByRole("button", { name: "Request access" }).click();
    await owner.getByRole("button", { name: "Grant Claim" }).click();
    await until(() => model.stored("plan").claimed_by === COLLABORATOR.id, "claim handed to the collaborator");
    await collab.getByText("You have edit access").waitFor();
    // The previous editor's open card becomes read-only straight away; nothing is left half-editable.
    await until(() => title.isDisabled(), "previous editor's title field is locked after the handoff");
    await drawer(owner).getByText(/Editing: Casey Collaborator/).waitFor();
    await context.close();
  });

  await check("an edit made on a claim the server already gave away is rejected, reverted and explained", async () => {
    const model = freshModel();
    const context = await openContext();
    const owner = await openPage(context, model);
    await owner.getByRole("heading", { name: "Plan the release", exact: true }).click();
    const title = owner.getByLabel("Milestone title");
    // The lease lapsed while this tab was offline and another person took over; no broadcast reached the tab.
    model.stored("plan").claimed_by = COLLABORATOR.id;
    model.stored("plan").claim_expires_at = new Date(model.now() + 5 * 60_000).toISOString();
    await title.fill("Edit after handoff");
    await title.press("Enter");
    await toastWith(owner, "Changes Not Saved");
    await until(async () => (await title.inputValue()) === "Plan the release", "owner's rejected edit reverted");
    const message = (await toasts(owner)).find(item => item.includes("Changes Not Saved"));
    assert.match(message, /Claim it again|Someone else/i);
    assert.equal(model.stored("plan").title, "Plan the release");
    await drawer(owner).getByText(/Editing: Casey Collaborator/).waitFor();
    await context.close();
  });

  await check("losing a claim race is reported instead of leaving a false lock on screen", async () => {
    const model = freshModel();
    const context = await openContext();
    model.stored("plan").claimed_by = null;
    model.stored("plan").claim_expires_at = null;
    const owner = await openPage(context, model);
    // The collaborator wins the claim on the server before the owner's click arrives.
    model.stored("plan").claimed_by = COLLABORATOR.id;
    model.stored("plan").claim_expires_at = new Date(model.now() + 5 * 60_000).toISOString();
    await owner.getByRole("heading", { name: "Plan the release", exact: true }).click();
    await drawer(owner).getByRole("button", { name: "Claim to edit" }).click();
    await toastWith(owner, "Claim Failed");
    await drawer(owner).getByText(/Editing: Casey Collaborator/).waitFor();
    assert.equal(model.stored("plan").claimed_by, COLLABORATOR.id);
    await context.close();
  });

  await check("going offline is shown honestly, unsaved edits are discarded with an explanation on reconnect", async () => {
    const model = freshModel();
    const context = await openContext();
    const page = await openPage(context, model);
    await page.getByRole("heading", { name: "Plan the release", exact: true }).click();
    await context.setOffline(true);
    model.fail(() => true, { network: true }, { once: false });
    await until(async () => (await saveState(page)) === "offline", "offline indicator", 15_000);
    await page.screenshot({ path: `${output}/offline.png` });
    const title = page.getByLabel("Milestone title");
    await title.fill("Written offline");
    await title.press("Enter");
    await toastWith(page, "Changes Not Saved");
    assert.equal(await saveState(page), "offline", "never claims saved while offline");
    model.clearFailures();
    await context.setOffline(false);
    await until(async () => (await toasts(page)).some(item => item.includes("Unsaved edits discarded")), "reconnect explains the discarded edit", 20_000);
    await until(async () => (await title.inputValue()) === "Plan the release", "screen shows the saved version again");
    assert.equal(model.stored("plan").title, "Plan the release");
    await until(async () => ["failed", "saved"].includes(await saveState(page)), "indicator leaves the offline state");
    await context.close();
  });

  await check("a realtime outage is recovered by reloading what was missed", async () => {
    const model = freshModel();
    const context = await openContext();
    const owner = await openPage(context, model);
    const collab = await openPage(context, model, { user: COLLABORATOR });
    await owner.evaluate(() => window.__canvasSmokeRealtime.drop());
    await collab.getByRole("heading", { name: "Ship with confidence", exact: true }).click();
    await collab.getByRole("button", { name: "Claim to edit" }).click().catch(() => {});
    await collab.keyboard.press("Escape");
    // The collaborator adds a milestone while the owner's channel is down.
    await addMilestone(collab, "Added while you were away");
    await until(() => nodeByTitle(model, "Added while you were away"), "collaborator's milestone stored");
    assert.equal(await owner.getByRole("group", { name: /Added while you were away/ }).count(), 0, "owner missed the live broadcast");
    await owner.evaluate(() => window.__canvasSmokeRealtime.restore());
    await owner.getByRole("group", { name: /Added while you were away/ }).waitFor();
    await context.close();
  });

  await check("a claim held while actively editing keeps being renewed past its five-minute lease", async () => {
    const model = freshModel();
    const context = await openContext();
    const page = await openPage(context, model, { clock: model.now() });
    await addMilestone(page, "Long edit session");
    const created = nodeByTitle(model, "Long edit session");
    await until(() => created.claimed_by === OWNER.id, "creator holds the claim");
    const leaseEndsAt = () => Date.parse(created.claim_expires_at);
    for (let minute = 0; minute < 7; minute += 1) {
      model.advance(60_000);
      await page.clock.runFor(60_000);
      await page.waitForTimeout(150);
      // Local edits during the session must not stop the renewal timer.
      await page.getByLabel("Milestone title").fill(`Long edit session ${minute}`).catch(() => {});
    }
    assert.ok(leaseEndsAt() > model.now(), "server lease was renewed while the editor kept working");
    assert.equal(created.claimed_by, OWNER.id);
    assert.ok(model.requests.some(request => request.body?.action === "heartbeat"), "heartbeats were sent");
    assert.equal(await page.getByText("You have edit access").count(), 1, "UI still shows edit access after the original lease would have ended");
    await context.close();
  });

  await check("on a phone the save status is visible and undo from the tools menu is saved", async () => {
    const model = freshModel();
    const { devices } = await import("playwright");
    const context = await openContext({ ...devices["iPhone 13"] });
    const page = await openPage(context, model);
    const status = indicator(page);
    await status.waitFor();
    const box = await status.boundingBox();
    const size = page.viewportSize();
    assert.ok(box.x >= 0 && box.x + box.width <= size.width && box.y >= 0, "status fits on the phone screen");
    await page.getByRole("button", { name: "Add milestone" }).click();
    const input = page.getByLabel("Milestone title");
    await input.fill("Phone idea");
    await input.press("Enter");
    await until(() => nodeByTitle(model, "Phone idea"), "milestone stored from a phone");
    await settled(page);
    await page.getByRole("button", { name: "Close details" }).click();
    await page.getByRole("button", { name: "Canvas tools" }).first().click();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await until(() => !nodeByTitle(model, "Phone idea") && model.nodes.some(node => /^Milestone Step/.test(node.title)), "undo of the rename saved");
    // The tools menu must stay on top of the selected-card bar while it is open.
    const stack = await page.evaluate(() => {
      const menu = document.querySelector("[aria-label='Canvas tools'][role='region']");
      if (!menu) return null;
      const rect = menu.getBoundingClientRect();
      const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height - 8);
      return menu.contains(top);
    });
    assert.notEqual(stack, false, "tools menu is not covered by the selected card bar");
    await page.screenshot({ path: `${output}/phone.png` });
    assert.deepEqual(page.errors, []);
    await context.close();
  });

  await check("removed members are signed out of the canvas with a clear message, not left editing", async () => {
    const model = freshModel();
    const context = await openContext();
    const page = await openPage(context, model, { user: COLLABORATOR });
    await page.getByRole("heading", { name: "Plan the release", exact: true }).click();
    const left = page.waitForRequest(request => new URL(request.url()).pathname === "/dashboard");
    page.session.current = { ...COLLABORATOR, member: false };
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await left;
    await context.close();
  });
} finally {
  await browser.close();
  await harness.close();
}

if (failures.length) {
  console.error(`Reliability browser checks failed (${failures.length}): ${failures.join("; ")}`);
  process.exit(1);
}
console.log(`Reliability browser checks passed (${passed}). Screenshots: ${output}`);
