import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { APP_VERSION, APP_RELEASE, APP_RELEASE_DATE } from "./release";

it("keeps release and package versions consistent", () => {
  const manifest = JSON.parse(readFileSync("package.json", "utf8"));
  const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
  expect(APP_VERSION).toBe("1.1.1");
  expect(APP_RELEASE).toBe("Beta v1.1.1");
  expect(APP_RELEASE_DATE).toBe("October 14, 2026");
  expect(manifest.version).toBe(APP_VERSION);
  expect(lock.version).toBe(APP_VERSION);
  expect(lock.packages[""].version).toBe(APP_VERSION);
});
