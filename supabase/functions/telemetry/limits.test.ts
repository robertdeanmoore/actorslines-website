import { test } from "node:test";
import assert from "node:assert/strict";
import { allowedRows, BurstLimiter, clientIp, readLimitedText, validInstallId } from "./limits.ts";

test("validInstallId accepts uuid, rejects junk", () => {
  assert.equal(validInstallId("3f2b8c1e-5d4a-4e6b-9c0d-1a2b3c4d5e6f"), true);
  for (const bad of [null, "", "short", "has space in it!", "x".repeat(65), "a;drop table x"]) assert.equal(validInstallId(bad), false);
});
test("BurstLimiter blocks over limit then recovers after window", () => {
  const l = new BurstLimiter();
  assert.equal(l.allow("a", 2, 1000, 0), true);
  assert.equal(l.allow("a", 2, 1000, 1), true);
  assert.equal(l.allow("a", 2, 1000, 2), false);
  assert.equal(l.allow("b", 2, 1000, 2), true);
  assert.equal(l.allow("a", 2, 1000, 1500), true);
});
test("BurstLimiter bounds memory", () => {
  const l = new BurstLimiter(3);
  for (let i = 0; i < 10; i++) l.allow("k" + i, 1, 1000, i);
  // @ts-expect-error private, test only
  assert.ok(l.hits.size <= 3);
});
test("clientIp", () => {
  assert.equal(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" })), "1.2.3.4");
  assert.equal(clientIp(new Headers()), "unknown");
});
test("readLimitedText enforces size", async () => {
  const big = new Request("https://x", { method: "POST", body: "a".repeat(100) });
  assert.equal(await readLimitedText(big, 50), null);
  const ok = new Request("https://x", { method: "POST", body: "hello" });
  assert.equal(await readLimitedText(ok, 50), "hello");
  const lying = new Request("https://x", { method: "POST", body: "a".repeat(100), headers: { "content-length": "5" } });
  assert.equal(await readLimitedText(lying, 50), null);
});
test("allowedRows", () => {
  assert.equal(allowedRows(100, 0, 1000, 0, 20000), 100);
  assert.equal(allowedRows(100, 950, 1000, 0, 20000), 50);
  assert.equal(allowedRows(100, 1000, 1000, 0, 20000), 0);
  assert.equal(allowedRows(100, 0, 1000, 19990, 20000), 10);
  assert.equal(allowedRows(100, 2000, 1000, 0, 20000), 0);
});
