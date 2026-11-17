import { test } from "node:test";
import assert from "node:assert/strict";
import { runUsagePurge } from "./purge.ts";

const ok = (d: unknown) => Promise.resolve({ data: d, error: null });

test("single pass when nothing hits a full batch", async () => {
  let calls = 0;
  const r = await runUsagePurge(() => { calls++; return ok({ telemetry_events: 3, recognition_reports: 0, request_messages: 1, trusted_devices: 0, invites: 0 }); }, 10);
  assert.equal(calls, 1);
  assert.deepEqual(r.totals, { telemetry_events: 3, recognition_reports: 0, request_messages: 1, trusted_devices: 0, invites: 0 });
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
  assert.deepEqual(r.totals, { telemetry_events: 0, recognition_reports: 0, request_messages: 0, trusted_devices: 0, invites: 0 });
});

test("junk rpc payload counts as zero and terminates", async () => {
  const r = await runUsagePurge(() => ok("nonsense"));
  assert.equal(r.passes, 1);
  assert.equal(r.errorCode, null);
});

test("trusted_devices and invites are summed across passes", async () => {
  const seq = [{ trusted_devices: 10, invites: 2 }, { trusted_devices: 3, invites: 0 }];
  let i = 0;
  const r = await runUsagePurge(() => ok({ telemetry_events: 0, recognition_reports: 0, request_messages: 0, ...seq[i++] }), 10);
  assert.equal(r.passes, 2);
  assert.equal(r.totals.trusted_devices, 13);
  assert.equal(r.totals.invites, 2);
});

test("a full invites batch alone triggers another pass", async () => {
  const seq = [10, 4];
  let i = 0;
  const r = await runUsagePurge(() => ok({ invites: seq[i++] }), 10);
  assert.equal(r.passes, 2);
  assert.equal(r.totals.invites, 14);
});

test("missing new keys from an older function version count as zero", async () => {
  const r = await runUsagePurge(() => ok({ telemetry_events: 1, recognition_reports: 1, request_messages: 1 }), 10);
  assert.equal(r.totals.trusted_devices, 0);
  assert.equal(r.totals.invites, 0);
  assert.equal(r.passes, 1);
});
