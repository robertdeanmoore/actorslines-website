import { test } from "node:test";
import assert from "node:assert/strict";
import { captchaRequired, isServerCall, kindLabel, parseKind, triageRequestBucket } from "./policy.ts";

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
test("kind defaults to enhancement when absent, accepts the two kinds, refuses anything else", () => {
  assert.equal(parseKind(undefined), "enhancement");
  assert.equal(parseKind(null), "enhancement");
  assert.equal(parseKind("support"), "support");
  assert.equal(parseKind("enhancement"), "enhancement");
  for (const bad of ["bogus", "", "Support", 1, true, {}, []]) assert.equal(parseKind(bad), null, String(bad));
});
test("kind labels", () => {
  assert.equal(kindLabel("support"), "Support");
  assert.equal(kindLabel("enhancement"), "Enhancement");
});

test("isServerCall: exact service key accepted", () => {
  assert.equal(isServerCall("Bearer sk-live-abc123", "sk-live-abc123"), true);
});
test("isServerCall: wrong key, same or different length, refused", () => {
  assert.equal(isServerCall("Bearer sk-live-abc124", "sk-live-abc123"), false);
  assert.equal(isServerCall("Bearer sk-live-abc12", "sk-live-abc123"), false);
  assert.equal(isServerCall("Bearer sk-live-abc1234", "sk-live-abc123"), false);
  assert.equal(isServerCall("Bearer sk-live-abc123sk-live-abc123", "sk-live-abc123"), false);
});
test("isServerCall: missing or empty header or key refused (fails closed)", () => {
  assert.equal(isServerCall(null, "k"), false);
  assert.equal(isServerCall(undefined, "k"), false);
  assert.equal(isServerCall("", "k"), false);
  assert.equal(isServerCall("Bearer ", "k"), false);
  assert.equal(isServerCall("Bearer ", ""), false);
  assert.equal(isServerCall("Bearer k", ""), false);
  assert.equal(isServerCall("Bearer k", undefined), false);
});
test("isServerCall: non-bearer schemes refused", () => {
  assert.equal(isServerCall("k", "k"), false);
  assert.equal(isServerCall("Basic k", "k"), false);
  assert.equal(isServerCall("bearer k", "k"), false);
  assert.equal(isServerCall("Token Bearer k", "k"), false);
});
