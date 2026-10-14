import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const output = resolve(".tmp/aws-layout-preview.html");
const result = spawnSync(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "src/lib/canvas/aws-layout.test.ts"], {
  stdio: "inherit", env: { ...process.env, AWS_LAYOUT_PREVIEW: output },
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
console.log(`AWS layout gallery: ${output}`);
