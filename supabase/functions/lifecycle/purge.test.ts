import { test } from "node:test";
import assert from "node:assert/strict";
import {
  betaRetentionCutoffs, drainAttachmentDeletions, runBetaPurge, runUsagePurge, subtractMonthsUtc,
} from "./purge.ts";

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

// ── Beta purge and attachment drain (WIP #269 slice 5.2c) ─────────────────────────────────────────

test("betaRetentionCutoffs at 2026-11-27T12:00:00.000Z gives 6-month and 90-day cutoffs", () => {
  const now = new Date("2026-11-27T12:00:00.000Z");
  const c = betaRetentionCutoffs(now);
  assert.equal(c.rejectedBefore, "2026-05-27T12:00:00.000Z");
  assert.equal(c.attachmentsClosedBefore, "2026-08-29T12:00:00.000Z");
});

test("subtractMonthsUtc clamps to month length, handles leap years and year wrap", () => {
  assert.equal(subtractMonthsUtc(new Date("2026-08-31T10:00:00Z"), 6).toISOString(), "2026-02-28T10:00:00.000Z");
  assert.equal(subtractMonthsUtc(new Date("2028-08-31T00:00:00Z"), 6).toISOString(), "2028-02-29T00:00:00.000Z");
  assert.equal(subtractMonthsUtc(new Date("2026-03-15T00:00:00Z"), 6).toISOString(), "2025-09-15T00:00:00.000Z");
});

test("cutoff boundary: exactly at the cutoff is not older, one second earlier is", () => {
  const c = betaRetentionCutoffs(new Date("2026-11-27T12:00:00.000Z"));
  const rejectedAt = Date.parse("2026-05-27T12:00:00.000Z");
  assert.equal(rejectedAt < Date.parse(c.rejectedBefore), false);
  assert.equal(Date.parse("2026-05-27T11:59:59.000Z") < Date.parse(c.rejectedBefore), true);
  const closedAt = Date.parse("2026-08-29T12:00:00.000Z");
  assert.equal(closedAt < Date.parse(c.attachmentsClosedBefore), false);
  assert.equal(Date.parse("2026-08-29T11:59:59.000Z") < Date.parse(c.attachmentsClosedBefore), true);
});

test("dry run makes exactly one rpc call even at a full batch", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const r = await runBetaPurge(
    (_n, args) => { calls.push(args); return ok({ rejected_applications: 10, attachments: 10 }); },
    new Date("2026-11-27T12:00:00.000Z"),
    true,
    10,
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].p_dry_run, true);
  assert.deepEqual(r.totals, { rejected_applications: 10, attachments: 10 });
  assert.equal(r.dryRun, true);
  assert.equal(r.errorCode, null);
});

test("real run args carry p_dry_run false, p_batch and the ISO cutoffs", async () => {
  const now = new Date("2026-11-27T12:00:00.000Z");
  const calls: Array<Record<string, unknown>> = [];
  await runBetaPurge(
    (_n, args) => { calls.push(args); return ok({ rejected_applications: 0, attachments: 0 }); },
    now,
    false,
    250,
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].p_dry_run, false);
  assert.equal(calls[0].p_batch, 250);
  const c = betaRetentionCutoffs(now);
  assert.equal(calls[0].p_rejected_before, c.rejectedBefore);
  assert.equal(calls[0].p_attachments_closed_before, c.attachmentsClosedBefore);
});

test("real run loops while a table returns a full batch and sums totals independently", async () => {
  const seq = [{ rejected_applications: 10, attachments: 10 }, { rejected_applications: 4, attachments: 0 }];
  let i = 0;
  const r = await runBetaPurge(() => ok(seq[i++]), new Date("2026-11-27T12:00:00.000Z"), false, 10);
  assert.equal(r.passes, 2);
  assert.deepEqual(r.totals, { rejected_applications: 14, attachments: 10 });
});

test("real run stops at the pass cap", async () => {
  let calls = 0;
  const r = await runBetaPurge(
    () => { calls++; return ok({ rejected_applications: 10, attachments: 0 }); },
    new Date("2026-11-27T12:00:00.000Z"),
    false,
    10,
    3,
  );
  assert.equal(calls, 3);
  assert.equal(r.passes, 3);
  assert.equal(r.totals.rejected_applications, 30);
});

test("rpc error on the first pass: zero totals, the code, or unknown when no code", async () => {
  const r = await runBetaPurge(
    () => Promise.resolve({ data: null, error: { code: "42501" } }),
    new Date("2026-11-27T12:00:00.000Z"),
    false,
    10,
  );
  assert.deepEqual(r.totals, { rejected_applications: 0, attachments: 0 });
  assert.equal(r.passes, 1);
  assert.equal(r.errorCode, "42501");
  const r2 = await runBetaPurge(
    () => Promise.resolve({ data: null, error: {} }),
    new Date("2026-11-27T12:00:00.000Z"),
    false,
    10,
  );
  assert.equal(r2.errorCode, "unknown");
});

test("junk payload counts as zero and terminates after one pass; negative and NaN counts are zero", async () => {
  const now = new Date("2026-11-27T12:00:00.000Z");
  const r = await runBetaPurge(() => ok("nonsense"), now, false, 10);
  assert.equal(r.passes, 1);
  assert.equal(r.errorCode, null);
  assert.deepEqual(r.totals, { rejected_applications: 0, attachments: 0 });
  const r2 = await runBetaPurge(() => ok(null), now, false, 10);
  assert.equal(r2.passes, 1);
  const r3 = await runBetaPurge(() => ok({ rejected_applications: -5, attachments: NaN }), now, false, 10);
  assert.deepEqual(r3.totals, { rejected_applications: 0, attachments: 0 });
});

test("drain happy path: batch of 2 paths removes and acks once", async () => {
  const paths = ["req1/screenshot.png", "req2/audio.m4a"];
  const removeCalls: string[][] = [];
  const ackCalls: string[][] = [];
  const r = await drainAttachmentDeletions(
    (n, args) => (n === "attachment_deletions_batch"
      ? ok(paths)
      : (ackCalls.push(args.p_paths as string[]), ok(null))),
    (p) => { removeCalls.push(p); return Promise.resolve({ error: null }); },
    500,
  );
  assert.deepEqual(removeCalls, [paths]);
  assert.deepEqual(ackCalls, [paths]);
  assert.equal(r.removed, 2);
  assert.equal(r.passes, 1);
  assert.equal(r.errorCode, null);
});

test("drain with a remove error: errorCode storage, ack never called, removed 0", async () => {
  const ackCalls: string[][] = [];
  const r = await drainAttachmentDeletions(
    (n) => (n === "attachment_deletions_batch" ? ok(["a.png"]) : (ackCalls.push([]), ok(null))),
    () => Promise.resolve({ error: { code: "Unauthorized" } }),
    500,
  );
  assert.equal(r.errorCode, "storage");
  assert.equal(ackCalls.length, 0);
  assert.equal(r.removed, 0);
});

test("drain with empty or non-array data: no remove; junk entries filtered out first", async () => {
  const removeCalls: string[][] = [];
  let ackCalls = 0;
  const r = await drainAttachmentDeletions(
    (n) => (n === "attachment_deletions_batch" ? ok([]) : (ackCalls++, ok(null))),
    (p) => { removeCalls.push(p); return Promise.resolve({ error: null }); },
    500,
  );
  assert.deepEqual(removeCalls, []);
  assert.equal(ackCalls, 0);
  assert.equal(r.errorCode, null);
  assert.equal(r.removed, 0);

  const acked: string[][] = [];
  const r2 = await drainAttachmentDeletions(
    (n, args) => (n === "attachment_deletions_batch"
      ? ok(["keep.png", "", 42, null])
      : (acked.push(args.p_paths as string[]), ok(null))),
    (p) => { removeCalls.push(p); return Promise.resolve({ error: null }); },
    500,
  );
  assert.deepEqual(removeCalls, [["keep.png"]]);
  assert.equal(r2.removed, 1);
});

test("drain loops on a full batch: two passes, removed 4, ack twice", async () => {
  const seq = [["a", "b", "c"], ["d"]];
  let i = 0;
  const removeCalls: string[][] = [];
  const ackCalls: string[][] = [];
  const r = await drainAttachmentDeletions(
    (n) => (n === "attachment_deletions_batch" ? ok(seq[i++]) : (ackCalls.push([]), ok(null))),
    (p) => { removeCalls.push(p); return Promise.resolve({ error: null }); },
    3,
  );
  assert.equal(r.passes, 2);
  assert.equal(r.removed, 4);
  assert.equal(ackCalls.length, 2);
  assert.deepEqual(removeCalls, [["a", "b", "c"], ["d"]]);
});

test("drain ack error stops with the ack code; batch rpc error stops with its code", async () => {
  const r = await drainAttachmentDeletions(
    (n) => (n === "attachment_deletions_batch"
      ? ok(["a.png"])
      : Promise.resolve({ data: null, error: { code: "40301" } })),
    () => Promise.resolve({ error: null }),
    500,
  );
  assert.equal(r.errorCode, "40301");
  assert.equal(r.removed, 0);
  const r2 = await drainAttachmentDeletions(
    () => Promise.resolve({ data: null, error: { code: "P0001" } }),
    () => Promise.resolve({ error: null }),
    500,
  );
  assert.equal(r2.errorCode, "P0001");
  assert.equal(r2.passes, 1);
});
