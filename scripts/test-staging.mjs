import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright";

const required = name => {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} for a disposable staging project.`);
  return value;
};
const origin = new URL(required("STAGING_BASE_URL")).origin;
const slug = required("STAGING_PROJECT_SLUG");
const accounts = ["OWNER", "MEMBER"].map(role => ({ email: required(`STAGING_${role}_EMAIL`), password: required(`STAGING_${role}_PASSWORD`) }));
const browser = await chromium.launch();
const contexts = [];
const nodeIds = [randomUUID(), randomUUID()];
const canvasPath = `/api/dashboard/projects/${encodeURIComponent(slug)}/canvas`;
let owner;
const post = (context, path, data) => context.request.post(`${origin}${path}`, { data, headers: { Origin: origin } });
try {
  for (const account of accounts) {
    const context = await browser.newContext(); contexts.push(context);
    const page = await context.newPage();
    await page.goto(`${origin}/login`);
    await page.locator("#email").fill(account.email);
    await page.locator("#password").fill(account.password);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.waitForURL(url => url.pathname.startsWith("/dashboard"), { timeout: 30_000 });
  }
  [owner] = contexts;
  const member = contexts[1];
  const read = async context => {
    const response = await context.request.get(`${origin}${canvasPath}`);
    assert.equal(response.status(), 200, "signed-in canvas access");
    return response.json();
  };
  await read(owner); await read(member);
  for (const [index, id] of nodeIds.entries()) {
    const response = await post(owner, canvasPath, { action: "create_node", id, title: `Release smoke ${id}`, position_x: 5000 + index * 400, position_y: 5000 });
    assert.equal((await response.json()).success, true, "create test node");
  }
  const initial = (await read(member)).nodes.filter(node => nodeIds.includes(node.id));
  const layout = initial.map(node => ({ id: node.id, version: node.version, position_x: node.position_x + 16, position_y: node.position_y }));
  assert.equal((await post(member, canvasPath, { action: "apply_layout", nodes: layout })).status(), 200);
  assert.equal((await post(owner, canvasPath, { action: "apply_layout", nodes: layout })).status(), 409, "stale batch rejected");
  const saved = (await read(owner)).nodes.filter(node => nodeIds.includes(node.id));
  assert.ok(saved.every(node => node.version === initial.find(before => before.id === node.id).version + 1), "rejected layout made no partial writes");
  const denied = await post(member, canvasPath, { action: "update_node", node_id: saved[0].id, expected_version: saved[0].version, updates: { title: "Forbidden edit" } });
  assert.equal((await denied.json()).success, false, "another user's live claim is enforced");
  const previews = await owner.request.get(`${origin}${canvasPath}/ai-generate`);
  assert.equal(previews.status(), 200, "preview migration is deployed");
  const durations = [];
  for (let batch = 0; batch < 5; batch++) await Promise.all(Array.from({ length: 4 }, async () => {
    const start = performance.now();
    const response = await member.request.get(`${origin}${canvasPath}?access=1`);
    assert.equal(response.status(), 204, "lightweight membership check");
    durations.push(performance.now() - start);
  }));
  durations.sort((a, b) => a - b);
  console.log(`PASS live authentication, membership, claim protection and atomic layout; access p95 ${Math.round(durations[18])}ms (20 requests, concurrency 4)`);
  if (process.env.STAGING_TEST_AI === "true") {
    const result = await post(owner, `${canvasPath}/ai-generate`, { prompt: "Create a separate three-step release workflow: plan, verify, ship. Keep existing content unchanged.", mode: "workflow", operation: "create" });
    const data = await result.json();
    assert.equal(result.status(), 200, "live AI generation");
    assert.ok(data.preview?.id, "AI must return an unapplied preview");
    const current = await read(owner);
    assert.ok(data.preview.nodes.every(node => !current.nodes.some(saved => saved.id === node.id)), "generation did not mutate the canvas");
    assert.equal((await post(owner, `${canvasPath}/ai-generate`, { action: "dismiss_preview", id: data.preview.id })).status(), 200);
    console.log("PASS live AI preview and dismissal (one generation request consumed)");
  } else console.log("NOT RUN live AI: enable STAGING_TEST_AI for the release gate.");
  await member.clearCookies();
  assert.equal((await member.request.get(`${origin}${canvasPath}`)).status(), 401, "expired session denied");
} finally {
  // Only remove resources created by this invocation, even after a failed check.
  if (owner) for (const nodeId of nodeIds) {
    const response = await post(owner, canvasPath, { action: "delete_node", node_id: nodeId });
    if (!response.ok()) { console.error(`Staging cleanup failed for ${nodeId}`); process.exitCode = 1; }
  }
  await browser.close();
}
