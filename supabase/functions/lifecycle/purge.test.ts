import { test } from "node:test";
import assert from "node:assert/strict";
import { runUsagePurge } from "./purge.ts";

const ok = (d: unknown) => Promise.resolve({ data: d, error: null });

test("single pass when nothing hits a full batch", async () => {
  let calls = 0;
  const r = await runUsagePurge(() => { calls++; return ok({ telemetry_events: 3, recognition_reports: 0, request_messages: 1 }); }, 10);
  assert.equal(calls, 1);
  assert.deepEqual(r.totals, { telemetry_events: 3, recognition_reports: 0, request_messages: 1 });
  assert.equal(r.errorCode, null);
});

test("loops while a table returns a full batch, sums totals", async () => {
  const seq = [10, 10, 4];
  let i = 0;
  const r = await runUsagePurge(() => ok({ telemetry_events: seq[i++], recognition_reports: 0, request_messages: 0 }), 10);
  assert.equal(r.passes, 3);
  assert.equal(r.totals.telemetry_events, 24);
});

test("stops at the pass cap", async () => {
  let calls = 0;
  const r = await runUsagePurge(() => { calls++; return ok({ telemetry_events: 10, recognition_reports: 0, request_messages: 0 }); }, 10, 4);
  assert.equal(calls, 4);
  assert.equal(r.passes, 4);
});

test("rpc error stops the loop and reports the code only", async () => {
  const r = await runUsagePurge(() => Promise.resolve({ data: null, error: { code: "42501" } }));
  assert.equal(r.errorCode, "42501");
  assert.equal(r.passes, 1);
  assert.deepEqual(r.totals, { telemetry_events: 0, recognition_reports: 0, request_messages: 0 });
});

test("junk rpc payload counts as zero and terminates", async () => {
  const r = await runUsagePurge(() => ok("nonsense"));
  assert.equal(r.passes, 1);
  assert.equal(r.errorCode, null);
});
