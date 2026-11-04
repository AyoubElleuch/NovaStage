import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, devices } from "playwright";
import { startHarness, root } from "./canvas-smoke/harness.mjs";
import { nodes, edges } from "./canvas-smoke/fixtures.mjs";
import { COLLABORATOR, createApiModel } from "./canvas-smoke/api-model.mjs";
import { createSessions, until } from "./canvas-smoke/browser-helpers.mjs";

// Built-in AI assistant: what a request will change before it runs, what it did afterwards, and how
// failures recover. The generation route is a deterministic MODEL (no model call, no paid quota).
const output = resolve(root, ".tmp/ai-assistant");
await mkdir(output, { recursive: true });
const harness = await startHarness();
const browser = await chromium.launch({ headless: true });
const { openContext, openPage } = createSessions({ browser, harness });
let passed = 0;
const failures = [];
const check = async (label, action) => {
  try { await action(); passed += 1; console.log(`PASS ${label}`); }
  catch (error) { failures.push(label); console.error(`FAIL ${label}\n${error.stack}`); }
};

const emptyModel = () => createApiModel({ nodes: [], edges: [] });
const seededModel = () => createApiModel({ nodes, edges });
const aiRequests = model => model.requests.filter(request => request.pathname.endsWith("/ai-generate"));
const assistant = page => page.getByRole("dialog", { name: "AI assistant" });
const preview = page => assistant(page).getByRole("region", { name: "What this will change" });
async function openAssistant(page) { await page.getByRole("button", { name: "Toggle AI Assistant" }).click(); await assistant(page).waitFor(); }
async function chooseMode(page, label) {
  await assistant(page).getByRole("combobox", { name: "Generation mode" }).click();
  await page.getByRole("option", { name: label }).click();
}
async function generate(page, prompt) {
  await assistant(page).getByLabel("AI prompt").fill(prompt);
  await assistant(page).getByRole("button", { name: /^Generate/ }).click();
}
const alertWith = (page, text) => assistant(page).getByRole("alert").filter({ hasText: text });

try {
  await check("an empty canvas says what each mode builds and promises nothing is changed", async () => {
    const context = await openContext();
    const page = await openPage(context, emptyModel());
    await openAssistant(page);
    await preview(page).getByText("Adds a new workflow to your canvas").waitFor();
    await preview(page).getByText(/Milestones with checkpoints and the dependencies between them/).waitFor();
    await preview(page).getByText(/AWS services and groups are not added or changed/).waitFor();
    await preview(page).getByText("Nothing on your canvas is changed.").waitFor();
    assert.equal(await preview(page).getByRole("group", { name: "Choose how to apply this" }).count(), 0, "no choice when there is nothing to update");
    await chooseMode(page, "AWS Architecture");
    await preview(page).getByText("Adds a new architecture to your canvas").waitFor();
    await preview(page).getByText(/Milestones and checkpoints are not added or changed/).waitFor();
    await assistant(page).getByText(/adds its result to the canvas right away\. Undo is available/).waitFor();
    await page.screenshot({ path: `${output}/preview-empty.png` });
    await context.close();
  });

  await check("existing work defaults to an update, can be switched to a separate diagram, and that choice is what is sent", async () => {
    const model = seededModel();
    const context = await openContext();
    const page = await openPage(context, model);
    await openAssistant(page);
    await assistant(page).getByLabel("AI prompt").fill("add a testing phase");
    await preview(page).getByText("Updates your existing workflow").waitFor();
    await preview(page).getByText(/3 existing milestones/).waitFor();
    assert.equal(await preview(page).getByRole("button", { name: "Update existing" }).getAttribute("aria-pressed"), "true");
    await preview(page).getByRole("button", { name: "Add new" }).click();
    await preview(page).getByText("Adds a separate new workflow").waitFor();
    await preview(page).getByText(/3 existing milestones are left as they are/).waitFor();
    await page.screenshot({ path: `${output}/preview-existing.png` });
    // Switching mode counts the other kind of content and resets the choice.
    await chooseMode(page, "AWS Architecture");
    await preview(page).getByText(/3 existing AWS resources/).waitFor();
    await chooseMode(page, "Workflow");
    await preview(page).getByRole("button", { name: "Add new" }).click();
    await assistant(page).getByRole("button", { name: /^Generate/ }).click();
    await until(() => aiRequests(model).length === 1, "generation request sent");
    assert.deepEqual({ mode: aiRequests(model)[0].body.mode, operation: aiRequests(model)[0].body.operation }, { mode: "workflow", operation: "create" });
    await context.close();
  });

  await check("after generating, a banner states what changed and Undo removes it for good", async () => {
    const model = seededModel();
    const context = await openContext();
    const page = await openPage(context, model);
    const before = { nodes: model.nodes.length, edges: model.edges.length };
    await openAssistant(page);
    await generate(page, "plan a launch");
    const banner = page.locator("[data-change-banner]");
    await banner.waitFor();
    assert.match(await banner.textContent(), /Workflow generated\. Added 3 cards and 2 connections\./);
    assert.equal(model.nodes.length, before.nodes + 3);
    await page.screenshot({ path: `${output}/result-banner.png` });
    await banner.getByRole("button", { name: "Undo" }).click();
    await until(() => model.nodes.length === before.nodes && model.edges.length === before.edges, "undo removed the generated items from the server");
    await banner.waitFor({ state: "detached" });
    await page.reload();
    await page.getByRole("region", { name: "Interactive canvas" }).waitFor();
    assert.equal(await page.getByRole("group", { name: /Discovery:/ }).count(), 0, "generated items stay removed after refresh");
    assert.deepEqual(page.errors, []);
    await context.close();
  });

  await check("AWS mode adds only architecture items and the banner says so", async () => {
    const model = seededModel();
    const milestones = model.nodes.filter(node => !node.node_type || node.node_type === "milestone").length;
    const context = await openContext();
    const page = await openPage(context, model);
    await openAssistant(page);
    await chooseMode(page, "AWS Architecture");
    await generate(page, "add a cache layer");
    const banner = page.locator("[data-change-banner]");
    await banner.waitFor();
    assert.match(await banner.textContent(), /AWS architecture generated\. Added 3 cards and 1 connection\./);
    assert.equal(model.nodes.filter(node => !node.node_type || node.node_type === "milestone").length, milestones, "no milestones were added");
    assert.equal(aiRequests(model)[0].body.operation, "update");
    await banner.getByRole("button", { name: "Dismiss" }).click();
    await banner.waitFor({ state: "detached" });
    await context.close();
  });

  await check("running out of AI requests explains it, keeps the prompt, offers your own AI, and does not sign you out", async () => {
    const model = seededModel();
    model.ai.remaining = 0;
    const context = await openContext();
    const page = await openPage(context, model);
    let leftCanvas = false;
    page.on("request", request => { if (new URL(request.url()).pathname === "/dashboard") leftCanvas = true; });
    await openAssistant(page);
    await generate(page, "plan the launch");
    const alert = alertWith(page, "You've used all your AI requests");
    await alert.waitFor();
    await alert.getByText(/Your own AI \(Codex or Claude\) doesn't use this allowance/).waitFor();
    assert.equal(await assistant(page).getByLabel("AI prompt").inputValue(), "plan the launch", "prompt is kept");
    await page.screenshot({ path: `${output}/quota.png` });
    await alert.getByRole("button", { name: "Use your own AI" }).click();
    await assistant(page).getByRole("region", { name: "Connect your AI" }).waitFor();
    assert.equal(leftCanvas, false, "a quota answer (HTTP 403) must not be treated as removal from the project");
    assert.equal(await page.getByRole("heading", { name: "Access Revoked" }).count(), 0);
    await context.close();
  });

  await check("a model failure leaves the canvas untouched, says nothing was counted, and Try again works", async () => {
    const model = seededModel();
    model.ai.failNext = true;
    const count = model.nodes.length;
    const context = await openContext();
    const page = await openPage(context, model);
    await openAssistant(page);
    await generate(page, "plan the launch");
    const alert = alertWith(page, "The AI couldn't produce a valid diagram");
    await alert.waitFor();
    await alert.getByText("This request wasn't counted against your limit.").waitFor();
    assert.equal(model.nodes.length, count);
    assert.equal(model.ai.remaining, 10);
    await alert.getByRole("button", { name: "Try again" }).click();
    await page.locator("[data-change-banner]").waitFor();
    assert.equal(model.ai.remaining, 9);
    await context.close();
  });

  await check("another person's generation names them and can be retried; a dropped connection reports it plainly", async () => {
    const model = seededModel();
    model.ai.lockedBy = COLLABORATOR.fullName;
    const context = await openContext();
    const page = await openPage(context, model);
    await openAssistant(page);
    await generate(page, "plan the launch");
    const busy = alertWith(page, "Casey Collaborator is generating right now");
    await busy.waitFor();
    model.ai.lockedBy = null;
    model.fail("ai-generate", { network: true });
    await busy.getByRole("button", { name: "Try again" }).click();
    const offline = alertWith(page, "Couldn't reach NovaStage");
    await offline.waitFor();
    await offline.getByText("Nothing was added to your canvas.").waitFor();
    await offline.getByRole("button", { name: "Try again" }).click();
    await page.locator("[data-change-banner]").waitFor();
    await context.close();
  });

  await check("on a phone the assistant explains the request and its failure inside the screen", async () => {
    const model = seededModel();
    model.ai.failNext = true;
    const context = await openContext({ ...devices["iPhone 13"] });
    const page = await openPage(context, model);
    await openAssistant(page);
    const size = page.viewportSize();
    const inside = async locator => { const box = await locator.boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= size.width + 0.5, `fits the ${size.width}px width: ${JSON.stringify(box)}`); };
    await assistant(page).getByLabel("AI prompt").fill("plan the launch");
    await preview(page).scrollIntoViewIfNeeded();
    await inside(preview(page));
    await page.screenshot({ path: `${output}/phone-preview.png` });
    await assistant(page).getByRole("button", { name: /^Generate/ }).click();
    const alert = alertWith(page, "The AI couldn't produce a valid diagram");
    await alert.scrollIntoViewIfNeeded();
    await inside(alert);
    const retry = await alert.getByRole("button", { name: "Try again" }).boundingBox();
    assert.ok(retry.height >= 36, `retry button is easy to tap (${retry.height}px)`);
    await page.screenshot({ path: `${output}/phone-failure.png` });
    await context.close();
  });
} finally {
  await browser.close();
  await harness.close();
}

if (failures.length) {
  console.error(`AI assistant browser checks failed (${failures.length}): ${failures.join("; ")}`);
  process.exit(1);
}
console.log(`AI assistant browser checks passed (${passed}). Screenshots: ${output}`);
