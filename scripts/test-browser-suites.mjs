import { spawnSync } from "node:child_process";

const suites = {
  canvas: "test-canvas-browser.mjs",
  usability: "test-usability-browser.mjs",
  reliability: "test-reliability-browser.mjs",
  ai: "test-ai-assistant-browser.mjs",
  generation: "test-generation-browser.mjs",
};
const selected = process.argv.slice(2);
if (selected.some((suite) => !suites[suite])) throw new Error("Unknown browser suite");
let failed = false;
for (const suite of selected.length ? selected : Object.keys(suites)) {
  const start = performance.now();
  const result = spawnSync(process.execPath, [`scripts/${suites[suite]}`], {
    stdio: "inherit",
    timeout: 300_000,
  });
  console.log(`${suite}: ${((performance.now() - start) / 1000).toFixed(1)}s`);
  if (result.error) console.error(result.error.message);
  failed ||= result.status !== 0;
}
process.exitCode = failed ? 1 : 0;
