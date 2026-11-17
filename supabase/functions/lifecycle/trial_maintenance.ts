// Daily trial-check upkeep (WIP #262, follow-up of DEF555), driven by migration 0031:
//   1. retry unresolved trial_check_failed rows (grant one trial if the key now reads and the
//      address has had none; close the row; otherwise leave it, grant nothing: fail closed)
//   2. purge trial_check_failed rows older than 90 days
//   3. count what is left; alert (count only) when > 0
//   4. purge trial_used rows older than 24 months (purge_trial_used, 0028)
// Pure of Deno APIs so node --test can run it. Logs codes and counts only, never row content.
// The grant itself is in SQL (retry_trial_check_failed), never here.

import { trialAlertBody, trialAlertSubject } from "./trial_alert_text.ts";

type RpcResult = { data: unknown; error: { code?: string } | null };
export type TrialRpc = (name: string, args: Record<string, unknown>) => PromiseLike<RpcResult>;
export type TrialDeps = {
  rpc: TrialRpc;
  /** Count of rows now left in trial_check_failed (head count; no row data). */
  countUnresolved: () => PromiseLike<{ count: number | null; error: { code?: string } | null }>;
  /** Send the alert to the notify address. False = not sent (unset address or mail failure). */
  sendAlert: (subject: string, body: string) => PromiseLike<boolean>;
  now: () => Date;
};

export const RETRY_BATCH = 500;
export const PURGE_BATCH = 5000;
export const PURGE_MAX_PASSES = 20;

export type TrialSummary = {
  retryGranted: number;
  retryClosed: number;
  retryStillFailing: number;
  unresolved: number;
  alertSent: boolean;
  checkFailedPurged: number;
  trialUsedPurged: number;
  errors: number;
};

function asCount(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;
}

async function purgeLoop(rpc: TrialRpc, name: string, batch: number, maxPasses: number): Promise<{ n: number; errorCode: string | null }> {
  let total = 0;
  for (let pass = 0; pass < maxPasses; pass++) {
    const { data, error } = await rpc(name, { p_batch: batch });
    if (error) return { n: total, errorCode: error.code ?? "unknown" };
    const got = asCount(data);
    total += got;
    if (got < batch) break;
  }
  return { n: total, errorCode: null };
}

export async function runTrialMaintenance(
  deps: TrialDeps,
  retryBatch = RETRY_BATCH,
  purgeBatch = PURGE_BATCH,
  maxPasses = PURGE_MAX_PASSES,
): Promise<TrialSummary> {
  const s: TrialSummary = {
    retryGranted: 0, retryClosed: 0, retryStillFailing: 0,
    unresolved: 0, alertSent: false, checkFailedPurged: 0, trialUsedPurged: 0, errors: 0,
  };

  // 1. one bounded retry pass per run (rows that still fail are not re-fetched in the same run)
  try {
    const { data, error } = await deps.rpc("retry_trial_check_failed", { p_batch: retryBatch });
    if (error) {
      console.error(`[lifecycle] trial retry failed code=${error.code ?? "unknown"}`);
      s.errors++;
    } else {
      const r = (data ?? {}) as Record<string, unknown>;
      s.retryGranted = asCount(r.granted);
      s.retryClosed = asCount(r.closed);
      s.retryStillFailing = asCount(r.still_failing);
    }
  } catch {
    console.error("[lifecycle] trial retry threw");
    s.errors++;
  }

  const purgeStep = async (name: string, key: "checkFailedPurged" | "trialUsedPurged") => {
    try {
      const r = await purgeLoop(deps.rpc, name, purgeBatch, maxPasses);
      s[key] = r.n;
      if (r.errorCode) {
        console.error(`[lifecycle] ${name} failed code=${r.errorCode}`);
        s.errors++;
      }
    } catch {
      console.error(`[lifecycle] ${name} threw`);
      s.errors++;
    }
  };

  // 2. 90-day purge of trial_check_failed (and stale rows whose user already holds a trial)
  await purgeStep("purge_trial_check_failed", "checkFailedPurged");

  // 3. count what is still unresolved (after retry and purge) and alert when > 0 (count only).
  // No count, no alert: a failed count is an error, not a zero.
  try {
    const { count, error } = await deps.countUnresolved();
    if (error || count === null) {
      console.error(`[lifecycle] trial unresolved count failed code=${error?.code ?? "unknown"}`);
      s.errors++;
    } else {
      s.unresolved = asCount(count);
      if (s.unresolved > 0) {
        s.alertSent = await deps.sendAlert(trialAlertSubject(), trialAlertBody(s.unresolved, deps.now().toISOString()));
        if (!s.alertSent) {
          console.error(`[lifecycle] trial alert not sent unresolved=${s.unresolved}`);
          s.errors++;
        }
      }
    }
  } catch {
    console.error("[lifecycle] trial alert threw");
    s.errors++;
  }

  // 4. 24-month purge of trial_used (purge_trial_used, 0028)
  await purgeStep("purge_trial_used", "trialUsedPurged");
  return s;
}
