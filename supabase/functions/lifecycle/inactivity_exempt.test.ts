import { test } from "node:test";
import assert from "node:assert/strict";
import { runInactivity, type InactivityDeps, type InactivitySummary, type InactiveRow } from "./inactivity.ts";

const NOW = Date.parse("2026-11-18T06:17:00Z");
const DAY = 24 * 60 * 60 * 1000;
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();

const freshSummary = (): InactivitySummary =>
  ({ warned1: 0, warned2: 0, deleted: 0, errors: 0, inactivityExempt: 0 });

function row(over: Partial<InactiveRow> = {}): InactiveRow {
  return { id: "u1", last_seen_at: iso(220), inactivity_warned_1_at: null, inactivity_warned_2_at: null, exempt: false, ...over };
}

/**
 * Fake of the DB side. `licensed` models the live answer of lifecycle_has_active_licence (the SQL
 * predicate itself is exercised in the migration's own scenario run, see PR description).
 */
function harness(rows: InactiveRow[], opts: { licensed?: boolean | "error"; listError?: boolean } = {}) {
  const sent: string[] = [];
  const updates: { id: string; patch: Record<string, string | null> }[] = [];
  const deleted: string[] = [];
  const deps: InactivityDeps = {
    now: NOW,
    listInactive: (_c, from, to) =>
      Promise.resolve(opts.listError ? { data: null, error: { code: "x" } }
        : { data: rows.slice(from, to + 1), error: null }),
    hasActiveLicence: () =>
      Promise.resolve(opts.licensed === "error" ? { data: null, error: { code: "x" } }
        : { data: opts.licensed ?? false, error: null }),
    getEmail: () => Promise.resolve("a@example.com"),
    sendEmail: (_to, subject) => { sent.push(subject); return Promise.resolve(true); },
    updateProfile: (id, patch) => { updates.push({ id, patch }); return Promise.resolve(true); },
    deleteUser: (id) => { deleted.push(id); return Promise.resolve(true); },
  };
  return { deps, sent, updates, deleted };
}

// The SQL selector marks exempt rows; licence-less, trial-only, revoked, refunded and expired
// accounts come back exempt=false and so follow the pre-DEF190 sequence unchanged.
test("free / trial-only / revoked / refunded / expired (all exempt=false): warn 1", async () => {
  const h = harness([row()]);
  const s = freshSummary();
  await runInactivity(h.deps, s);
  assert.equal(s.warned1, 1);
  assert.equal(s.inactivityExempt, 0);
  assert.deepEqual(h.updates.map((u) => Object.keys(u.patch)), [["inactivity_warned_1_at"]]);
});

test("not exempt: warn 2 after a fortnight, then deleted a fortnight later (expired licence still deleted)", async () => {
  const h2 = harness([row({ inactivity_warned_1_at: iso(15) })]);
  const s2 = freshSummary();
  await runInactivity(h2.deps, s2);
  assert.equal(s2.warned2, 1);
  assert.deepEqual(h2.deleted, []);

  const h3 = harness([row({ inactivity_warned_1_at: iso(30), inactivity_warned_2_at: iso(15) })], { licensed: false });
  const s3 = freshSummary();
  await runInactivity(h3.deps, s3);
  assert.deepEqual(h3.deleted, ["u1"]);
  assert.equal(s3.deleted, 1);
});

test("paid app-only account (exempt): no email, no delete, counted", async () => {
  const h = harness([row({ exempt: true })]);
  const s = freshSummary();
  await runInactivity(h.deps, s);
  assert.deepEqual(h.sent, []);
  assert.deepEqual(h.deleted, []);
  assert.deepEqual(h.updates, []);
  assert.equal(s.inactivityExempt, 1);
});

test("exempt with old warning stamps: stamps cleared, not deleted", async () => {
  const h = harness([row({ exempt: true, inactivity_warned_1_at: iso(100), inactivity_warned_2_at: iso(85) })]);
  const s = freshSummary();
  await runInactivity(h.deps, s);
  assert.deepEqual(h.updates, [{ id: "u1", patch: { inactivity_warned_1_at: null, inactivity_warned_2_at: null } }]);
  assert.deepEqual(h.deleted, []);
  assert.equal(s.inactivityExempt, 1);
});

test("lapse after old warnings: selector returns stamps nulled, so a FRESH warning 1 is sent, no delete", async () => {
  // SQL nulls stamps older than the licence end (0032); the account re-enters at warning 1.
  const h = harness([row({ inactivity_warned_1_at: null, inactivity_warned_2_at: null })]);
  const s = freshSummary();
  await runInactivity(h.deps, s);
  assert.equal(s.warned1, 1);
  assert.deepEqual(h.deleted, []);
});

test("licence appears between selection and deletion: re-check keeps the account and clears stamps", async () => {
  const h = harness([row({ inactivity_warned_1_at: iso(30), inactivity_warned_2_at: iso(15) })], { licensed: true });
  const s = freshSummary();
  await runInactivity(h.deps, s);
  assert.deepEqual(h.deleted, []);
  assert.equal(s.inactivityExempt, 1);
  assert.equal(h.updates.length, 1);
});

test("licence re-check fails: deletion skipped, error counted", async () => {
  const h = harness([row({ inactivity_warned_1_at: iso(30), inactivity_warned_2_at: iso(15) })], { licensed: "error" });
  const s = freshSummary();
  await runInactivity(h.deps, s);
  assert.deepEqual(h.deleted, []);
  assert.equal(s.errors, 1);
});

test("selector fails: nothing warned or deleted, error counted", async () => {
  const h = harness([row()], { listError: true });
  const s = freshSummary();
  await runInactivity(h.deps, s);
  assert.deepEqual(h.sent, []);
  assert.deepEqual(h.deleted, []);
  assert.equal(s.errors, 1);
});

test("more than 1000 stale accounts: every page is read", async () => {
  const rows = Array.from({ length: 1500 }, (_, i) => row({ id: `u${i}`, exempt: true }));
  const h = harness(rows);
  const s = freshSummary();
  await runInactivity(h.deps, s);
  assert.equal(s.inactivityExempt, 1500);
});
