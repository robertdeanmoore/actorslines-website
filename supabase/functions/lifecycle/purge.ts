// Drives public.purge_usage_data() (migration 0027) until the backlog is gone or the pass cap is hit.
// Pure of Deno APIs so node --test can run it. Logs counts only, never row content.

export type UsagePurgeCounts = {
  telemetry_events: number;
  recognition_reports: number;
  request_messages: number;
  trusted_devices: number;
  invites: number;
};

type RpcResult = { data: unknown; error: { code?: string } | null };
export type PurgeRpc = (name: string, args: Record<string, unknown>) => PromiseLike<RpcResult>;

export const PURGE_BATCH = 5000;
export const PURGE_MAX_PASSES = 20;

function asCount(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0;
}

export async function runUsagePurge(
  rpc: PurgeRpc,
  batch = PURGE_BATCH,
  maxPasses = PURGE_MAX_PASSES,
): Promise<{ totals: UsagePurgeCounts; passes: number; errorCode: string | null }> {
  const totals: UsagePurgeCounts = {
    telemetry_events: 0, recognition_reports: 0, request_messages: 0, trusted_devices: 0, invites: 0,
  };
  let passes = 0;
  while (passes < maxPasses) {
    const { data, error } = await rpc("purge_usage_data", { p_batch: batch });
    passes++;
    if (error) return { totals, passes, errorCode: error.code ?? "unknown" };
    const r = (data ?? {}) as Record<string, unknown>;
    const got = {
      telemetry_events: asCount(r.telemetry_events),
      recognition_reports: asCount(r.recognition_reports),
      request_messages: asCount(r.request_messages),
      trusted_devices: asCount(r.trusted_devices),
      invites: asCount(r.invites),
    };
    totals.telemetry_events += got.telemetry_events;
    totals.recognition_reports += got.recognition_reports;
    totals.request_messages += got.request_messages;
    totals.trusted_devices += got.trusted_devices;
    totals.invites += got.invites;
    const full = Object.values(got).some((n) => n >= batch);
    if (!full) break;
  }
  return { totals, passes, errorCode: null };
}

// ── Beta programme and attachment retention (WIP #269 P5.2; SQL in migration 0042) ──────────────
// Rejected beta applications: personal data deleted 6 months after the decision. Request
// attachments (screenshot, audio): deleted 90 days after the request closes. The database function
// also enforces both floors, so a wrong cutoff from here can never purge early.

export const REJECTED_RETENTION_MONTHS = 6;
export const ATTACHMENT_RETENTION_DAYS = 90;
export const BETA_PURGE_BATCH = 1000;
export const ATTACHMENT_DRAIN_BATCH = 500;

export type BetaPurgeCounts = { rejected_applications: number; attachments: number };

/** Calendar-month subtraction in UTC that clamps the day (31 Aug minus 6 months is 28 or 29 Feb). */
export function subtractMonthsUtc(from: Date, months: number): Date {
  const total = from.getUTCFullYear() * 12 + from.getUTCMonth() - months;
  const year = Math.floor(total / 12);
  const month = total - year * 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(
    year, month, Math.min(from.getUTCDate(), lastDay),
    from.getUTCHours(), from.getUTCMinutes(), from.getUTCSeconds(), from.getUTCMilliseconds(),
  ));
}

export function betaRetentionCutoffs(now: Date): { rejectedBefore: string; attachmentsClosedBefore: string } {
  return {
    rejectedBefore: subtractMonthsUtc(now, REJECTED_RETENTION_MONTHS).toISOString(),
    attachmentsClosedBefore: new Date(now.getTime() - ATTACHMENT_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/** Dry run: exactly one call, counts only, nothing deleted. Real run: loops while either table fills a batch. */
export async function runBetaPurge(
  rpc: PurgeRpc,
  now: Date,
  dryRun: boolean,
  batch = BETA_PURGE_BATCH,
  maxPasses = PURGE_MAX_PASSES,
): Promise<{ totals: BetaPurgeCounts; passes: number; dryRun: boolean; errorCode: string | null }> {
  const cutoffs = betaRetentionCutoffs(now);
  const totals: BetaPurgeCounts = { rejected_applications: 0, attachments: 0 };
  let passes = 0;
  while (passes < (dryRun ? 1 : maxPasses)) {
    const { data, error } = await rpc("purge_beta_data", {
      p_rejected_before: cutoffs.rejectedBefore,
      p_attachments_closed_before: cutoffs.attachmentsClosedBefore,
      p_dry_run: dryRun,
      p_batch: batch,
    });
    passes++;
    if (error) return { totals, passes, dryRun, errorCode: error.code ?? "unknown" };
    const r = (data ?? {}) as Record<string, unknown>;
    const got = { rejected_applications: asCount(r.rejected_applications), attachments: asCount(r.attachments) };
    totals.rejected_applications += got.rejected_applications;
    totals.attachments += got.attachments;
    if (dryRun || !Object.values(got).some((n) => n >= batch)) break;
  }
  return { totals, passes, dryRun, errorCode: null };
}

export type StorageRemove = (paths: string[]) => PromiseLike<{ error: { code?: string; message?: string } | null }>;

/**
 * Removes queued storage objects (paths whose database row is already gone) through the Storage API,
 * then acknowledges them. A failed removal is NOT acknowledged, so the path stays queued and the next
 * run retries it. Logs counts only, never a path.
 */
export async function drainAttachmentDeletions(
  rpc: PurgeRpc,
  remove: StorageRemove,
  batch = ATTACHMENT_DRAIN_BATCH,
  maxPasses = PURGE_MAX_PASSES,
): Promise<{ removed: number; passes: number; errorCode: string | null }> {
  let removed = 0;
  let passes = 0;
  while (passes < maxPasses) {
    const { data, error } = await rpc("attachment_deletions_batch", { p_batch: batch });
    passes++;
    if (error) return { removed, passes, errorCode: error.code ?? "unknown" };
    const paths = Array.isArray(data) ? data.filter((p): p is string => typeof p === "string" && p.length > 0) : [];
    if (paths.length === 0) break;
    const { error: removeErr } = await remove(paths);
    if (removeErr) return { removed, passes, errorCode: "storage" };
    const ack = await rpc("attachment_deletions_ack", { p_paths: paths });
    if (ack.error) return { removed, passes, errorCode: ack.error.code ?? "unknown" };
    removed += paths.length;
    if (paths.length < batch) break;
  }
  return { removed, passes, errorCode: null };
}
