// Drives public.purge_usage_data() (migration 0027) until the backlog is gone or the pass cap is hit.
// Pure of Deno APIs so node --test can run it. Logs counts only, never row content.

export type UsagePurgeCounts = {
  telemetry_events: number;
  recognition_reports: number;
  request_messages: number;
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
  const totals: UsagePurgeCounts = { telemetry_events: 0, recognition_reports: 0, request_messages: 0 };
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
    };
    totals.telemetry_events += got.telemetry_events;
    totals.recognition_reports += got.recognition_reports;
    totals.request_messages += got.request_messages;
    const full = Object.values(got).some((n) => n >= batch);
    if (!full) break;
  }
  return { totals, passes, errorCode: null };
}
