import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";

const root = resolve(".");
const output = resolve(process.env.GENERATION_SCREENSHOTS || ".tmp/generation-after");
let graphs;
const server = await createServer({ root, configFile: false, plugins: [react(), { name: "generation-fixtures", configureServer(server) {
  server.middlewares.use((request, response, next) => {
    const graph = graphs?.[request.url?.split("/__generation/")[1]];
    if (!graph) return next();
    response.setHeader("Content-Type", "application/json"); response.end(JSON.stringify(graph));
  });
} }],
  resolve: { alias: [
    ...["@/lib/supabase/client", "@/components/notifications/notification-provider", "@/lib/canvas/sound-effects", "next/link"].map(find => ({ find, replacement: resolve(root, "scripts/canvas-smoke/mocks.jsx") })),
    { find: "@", replacement: resolve(root, "src") },
  ] },
  server: { host: "127.0.0.1", port: 0, watch: { ignored: ["**/.next/**", "**/.tmp/**"] } },
});
const { buildMcpGraph } = await server.ssrLoadModule("/src/lib/mcp/graph.ts");
const { sampleWorkflow, sampleArchitecture } = await server.ssrLoadModule("/src/lib/mcp/test-fixtures.ts");
const { AWS_ARCHITECTURE_FIXTURES } = await server.ssrLoadModule("/src/lib/canvas/__fixtures__/aws-architectures.ts");
const workflow = sampleWorkflow();
workflow.milestones.push({ ...structuredClone(workflow.milestones[1]), tempId: "parallel", title: "Implement the parallel integration and verify the release readiness of the entire platform", checkpoints: Array.from({ length: 9 }, (_, i) => ({ title: `Checkpoint ${i + 1}: Confirm long requirement text is readable and all important acceptance criteria remain available in the details panel` })) });
workflow.edges = [{ fromId: "plan", toId: "parallel" }, { fromId: "parallel", toId: "ship" }, { fromId: "plan", toId: "ship" }];
const inputs = { workflow, serverless: sampleArchitecture(), nested: AWS_ARCHITECTURE_FIXTURES[4].result, feedback: AWS_ARCHITECTURE_FIXTURES[3].result };
graphs = Object.fromEntries(Object.entries(inputs).map(([name, input]) => [name, buildMcpGraph({ ...input, intent: "create_parallel" }, [])]));
const addition = buildMcpGraph({ ...sampleArchitecture(), intent: "create_parallel" }, graphs.workflow.nodes);
graphs.appended = { nodes: [...graphs.workflow.nodes, ...addition.nodes], edges: [...graphs.workflow.edges, ...addition.edges] };
await mkdir(output, { recursive: true });
await server.listen();
const origin = server.resolvedUrls.local[0];
let browser;
const checks = [];
try {
  browser = await chromium.launch({ headless: true });
  for (const [device, viewport] of Object.entries({ desktop: { width: 1440, height: 1000 }, phone: { width: 390, height: 844 } })) {
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({ viewport, colorScheme: theme });
      await context.addInitScript(theme => localStorage.setItem("novastage-theme", theme), theme);
      for (const name of Object.keys(graphs)) {
        const page = await context.newPage();
        const errors = []; page.on("pageerror", error => errors.push(error.message));
        await page.route("**/api/**", route => { throw new Error(`Unexpected API call: ${route.request().url()}`); });
        await page.goto(`${origin}scripts/canvas-smoke/index.html?generation=${name}`);
        await page.locator("[data-node-id]").first().waitFor();
        await page.getByRole("button", { name: "Fit canvas", exact: true }).click();
        const invalid = await page.locator("[data-node-id]").evaluateAll(cards => cards.flatMap(card => {
          const box = card.getBoundingClientRect();
          return box.left < -1 || box.top < 100 || box.right > innerWidth + 1 || box.bottom > innerHeight - 65 ? [card.getAttribute("aria-label")] : [];
        }));
        assert.deepEqual(invalid, [], "fit must include every boundary and card even on a phone");
        const clipped = await page.locator('[data-node-type="milestone"], [data-node-type="aws_service"]').evaluateAll(cards => cards.filter(card => card.scrollHeight > card.clientHeight + 2).map(card => card.getAttribute("aria-label")));
        assert.deepEqual(clipped, [], "cards must reserve their rendered content height");
        await page.screenshot({ path: resolve(output, `${name}-${device}-${theme}.png`) });
        assert.deepEqual(errors, []);
        assert.equal(await page.locator("[data-node-id]").count(), graphs[name].nodes.length);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        const transform = () => page.locator("[data-canvas-viewport] > div").first().getAttribute("style");
        const fitted = await transform();
        await page.getByRole("button", { name: "Zoom in", exact: true }).click();
        assert.notEqual(await transform(), fitted);
        await page.getByRole("button", { name: "Fit canvas", exact: true }).click();
        assert.equal(await transform(), fitted);
        await page.locator("[data-canvas-viewport]").focus();
        await page.keyboard.press("ArrowRight");
        assert.notEqual(await transform(), fitted, "keyboard pan must move the world");
        await page.getByRole("button", { name: "Fit canvas", exact: true }).click();
        if (name === "workflow") {
          const card = page.locator('[data-node-type="milestone"]').filter({ has: page.getByRole("heading", { name: workflow.milestones[2].title, exact: true }) });
          await card.focus(); await card.press("Enter");
          await page.getByRole("dialog").waitFor();
          assert.equal(await page.getByRole("dialog").getByRole("listitem").count(), 9);
          await page.screenshot({ path: resolve(output, `workflow-details-${device}-${theme}.png`) });
          await page.keyboard.press("Escape");
        }
        checks.push(`${name}-${device}-${theme}`);
        await page.close();
      }
      await context.close();
    }
  }
  await writeFile(resolve(output, "results.json"), JSON.stringify({ checks, graphs }, null, 2));
  console.log(`PASS ${checks.length} generated canvas screenshots: ${output}`);
} finally { await browser?.close(); await server.close(); }
