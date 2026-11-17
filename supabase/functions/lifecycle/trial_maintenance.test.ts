import { test } from "node:test";
import assert from "node:assert/strict";
import { runTrialMaintenance, type TrialDeps } from "./trial_maintenance.ts";
import { trialAlertBody, trialAlertSubject } from "./trial_alert_text.ts";

const NOW = new Date("2026-11-17T03:04:05.000Z");
const NOW_ISO = NOW.toISOString();

type Scripted = { data?: unknown; error?: { code?: string } | null };

function makeDeps(opts: {
  rpcScript?: Record<string, Scripted[]>;
  count?: { count: number | null; error?: { code?: string } | null };
  alertResult?: boolean;
  alertThrows?: boolean;
} = {}) {
  const rpcCalls: { name: string; args: Record<string, unknown> }[] = [];
  const alerts: { subject: string; body: string }[] = [];
  const events: string[] = [];
  const scripts = opts.rpcScript ?? {};
  const deps: TrialDeps = {
    rpc: (name, args) => {
      rpcCalls.push({ name, args });
      events.push(`rpc:${name}`);
      const q = scripts[name];
      const next = q && q.length > 0 ? q.shift()! : {};
      return Promise.resolve({ data: next.data ?? null, error: next.error ?? null });
    },
    countUnresolved: () => {
      events.push("count");
      return Promise.resolve({ count: opts.count ? opts.count.count : 0, error: opts.count?.error ?? null });
    },
    sendAlert: (subject, body) => {
      alerts.push({ subject, body });
      events.push("sendAlert");
      if (opts.alertThrows) return Promise.reject(new Error("mail down"));
      return Promise.resolve(opts.alertResult ?? true);
    },
    now: () => NOW,
  };
  return { deps, rpcCalls, alerts, events };
}

const ok = (data: unknown) => ({ data, error: null });

test("order: retry, purge_trial_check_failed, count/alert, purge_trial_used", async () => {
  const { deps, rpcCalls, events } = makeDeps({
    count: { count: 2, error: null },
    rpcScript: { purge_trial_used: [{ data: 0 }] },
  });
  await runTrialMaintenance(deps);
  assert.deepEqual(
    rpcCalls.map((c) => c.name),
    ["retry_trial_check_failed", "purge_trial_check_failed", "purge_trial_used"],
  );
  const afterPurgeFailed = events.indexOf("rpc:purge_trial_check_failed");
  const alert = events.indexOf("sendAlert");
  const used = events.indexOf("rpc:purge_trial_used");
  assert.ok(afterPurgeFailed >= 0 && alert > afterPurgeFailed && alert < used);
});

test("retry result maps granted/closed/still_failing", async () => {
  const { deps } = makeDeps({ rpcScript: { retry_trial_check_failed: [ok({ granted: 1, closed: 2, still_failing: 3 })] } });
  const s = await runTrialMaintenance(deps);
  assert.equal(s.retryGranted, 1);
  assert.equal(s.retryClosed, 2);
  assert.equal(s.retryStillFailing, 3);
});

test("count 0: no alert, alertSent false", async () => {
  const { deps, alerts } = makeDeps({ count: { count: 0, error: null } });
  const s = await runTrialMaintenance(deps);
  assert.equal(s.alertSent, false);
  assert.equal(alerts.length, 0);
});

test("count 2: exactly one alert with count and time, no PII patterns", async () => {
  const { deps, alerts } = makeDeps({ count: { count: 2, error: null } });
  const s = await runTrialMaintenance(deps);
  assert.equal(s.alertSent, true);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].subject, trialAlertSubject());
  assert.equal(alerts[0].body, trialAlertBody(2, NOW_ISO));
  assert.ok((alerts[0].subject + "\n" + alerts[0].body).includes("2"));
  assert.ok((alerts[0].subject + "\n" + alerts[0].body).includes(NOW_ISO));
  for (const text of [alerts[0].subject, alerts[0].body]) {
    assert.ok(!/@/.test(text));
    assert.ok(!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(text));
    assert.ok(!/hash/i.test(text));
    assert.ok(!/SQLSTATE/i.test(text));
  }
});

test("count null with error: no alert, errors>=1, purge_trial_used still called", async () => {
  const { deps, alerts, rpcCalls } = makeDeps({ count: { count: null, error: { code: "42501" } } });
  const s = await runTrialMaintenance(deps);
  assert.equal(s.alertSent, false);
  assert.equal(alerts.length, 0);
  assert.ok(s.errors >= 1);
  assert.ok(rpcCalls.some((c) => c.name === "purge_trial_used"));
});

test("sendAlert returns false: errors incremented, resolves, purge_trial_used still called", async () => {
  const { deps, rpcCalls } = makeDeps({ count: { count: 1, error: null }, alertResult: false });
  const s = await runTrialMaintenance(deps);
  assert.equal(s.alertSent, false);
  assert.ok(s.errors >= 1);
  assert.ok(rpcCalls.some((c) => c.name === "purge_trial_used"));
});

test("sendAlert throws: no rejection, errors>=1", async () => {
  const { deps } = makeDeps({ count: { count: 1, error: null }, alertThrows: true });
  const s = await runTrialMaintenance(deps);
  assert.ok(s.errors >= 1);
});

test("retry rpc error: errors>=1, purges still run, no alert when count is 0", async () => {
  const { deps, alerts, rpcCalls } = makeDeps({
    count: { count: 0, error: null },
    rpcScript: { retry_trial_check_failed: [{ data: null, error: { code: "42883" } }] },
  });
  const s = await runTrialMaintenance(deps);
  assert.ok(s.errors >= 1);
  assert.ok(rpcCalls.some((c) => c.name === "purge_trial_check_failed"));
  assert.ok(rpcCalls.some((c) => c.name === "purge_trial_used"));
  assert.equal(alerts.length, 0);
});

test("retry rpc throws: no rejection, purges still run", async () => {
  const { deps } = makeDeps({ count: { count: 0, error: null } });
  deps.rpc = () => Promise.reject(new Error("boom"));
  const s = await runTrialMaintenance(deps);
  assert.ok(s.errors >= 1);
  const s2 = await runTrialMaintenance(deps);
  assert.ok(s2.errors >= 1);
});

test("purge loop: full batches repeat, totals sum, stops at maxPasses", async () => {
  const { deps, rpcCalls } = makeDeps({
    rpcScript: { purge_trial_used: [ok(10), ok(10), ok(4)] },
  });
  const s = await runTrialMaintenance(deps, 500, 10, 2);
  const usedCalls = rpcCalls.filter((c) => c.name === "purge_trial_used");
  assert.equal(usedCalls.length, 2);
  assert.deepEqual(usedCalls.map((c) => c.args), [{ p_batch: 10 }, { p_batch: 10 }]);
  assert.equal(s.trialUsedPurged, 20);
});

test("purge error stops that loop only; other purge still runs", async () => {
  const { deps, rpcCalls } = makeDeps({
    rpcScript: { purge_trial_check_failed: [{ data: null, error: { code: "42501" } }] },
  });
  const s = await runTrialMaintenance(deps);
  assert.ok(s.errors >= 1);
  assert.equal(s.checkFailedPurged, 0);
  assert.ok(rpcCalls.some((c) => c.name === "purge_trial_used"));
});

test("junk purge payload counts as zero and terminates", async () => {
  const { deps } = makeDeps({ rpcScript: { purge_trial_used: [ok("nonsense")] } });
  const s = await runTrialMaintenance(deps);
  assert.equal(s.trialUsedPurged, 0);
});

test("console.error output never contains email-like or uuid-like strings", async () => {
  const captured: string[] = [];
  const orig = console.error;
  console.error = (...a: unknown[]) => captured.push(a.map(String).join(" "));
  try {
    const { deps } = makeDeps({
      count: { count: 3, error: { code: "42501" } },
      rpcScript: { retry_trial_check_failed: [{ data: null, error: { code: "42883" } }] },
      alertThrows: true,
    });
    await runTrialMaintenance(deps);
  } finally {
    console.error = orig;
  }
  const all = captured.join("\n");
  assert.ok(all.length > 0);
  assert.ok(!/[\w.+-]+@[\w-]+\.[\w.]+/.test(all));
  assert.ok(!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(all));
});

test("trialAlertSubject and trialAlertBody directly: count and time present, no @", () => {
  assert.equal(trialAlertSubject(), "Actors Lines: trial checks need attention");
  const body = trialAlertBody(7, NOW_ISO);
  assert.ok(body.includes("7"));
  assert.ok(body.includes(NOW_ISO));
  assert.ok(!/@/.test(body));
  assert.ok(body.split("\n").length <= 8);
});

test("retry is one bounded call with the batch size", async () => {
  const { deps, rpcCalls } = makeDeps();
  await runTrialMaintenance(deps, 123);
  const retries = rpcCalls.filter((c) => c.name === "retry_trial_check_failed");
  assert.equal(retries.length, 1);
  assert.deepEqual(retries[0].args, { p_batch: 123 });
});
