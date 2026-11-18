import { expect, it } from "vitest";
import { signInErrorMessage } from "./errors";

it("distinguishes a service outage from invalid credentials", () => {
  for (const error of [{ name: "AuthRetryableFetchError" }, { status: 0 }, { status: 503 }]) {
    expect(signInErrorMessage(error)).toContain("temporarily unavailable");
  }
  expect(signInErrorMessage({ status: 400, code: "invalid_credentials" })).toContain("incorrect");
  expect(signInErrorMessage({ status: 429 })).toContain("wait");
});
