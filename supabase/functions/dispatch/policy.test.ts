import { test } from "node:test";
import assert from "node:assert/strict";
import { captchaRequired, triageRequestBucket } from "./policy.ts";

test("captcha skipped only for admin on manual triage", () => {
  assert.equal(captchaRequired("triage-report", true), false);
});
test("captcha kept for non-admin triage and for submit, admin or not", () => {
  assert.equal(captchaRequired("triage-report", false), true);
  assert.equal(captchaRequired("submit-request", true), true);
  assert.equal(captchaRequired("submit-request", false), true);
});
test("triage bucket is per request", () => {
  assert.equal(triageRequestBucket(3), "triage-req:3");
  assert.notEqual(triageRequestBucket(3), triageRequestBucket(4));
});
