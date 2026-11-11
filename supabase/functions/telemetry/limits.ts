// Abuse limits for the telemetry ingest. Pure helpers (no Deno/Supabase imports) so they can be
// unit-tested with `npm run test:edge`.
//
// Layers, because the shared secret ships in the APK and is extractable:
//   1. request-size cap (before parsing),
//   2. per-IP and per-install burst limits (in-memory, per isolate: best effort, cheap),
//   3. per-install and global daily caps (counted in the database: authoritative, see index.ts).

export const MAX_BODY_BYTES = 128 * 1024; // the app sends <= 100 short events (~20 KB)
export const MAX_EVENTS_PER_BATCH = 200; // the app's BATCH_SIZE is 100

// Daily (rolling 24 h) caps, rows. A normal install logs a few dozen events a day.
export const DAILY_EVENTS_PER_INSTALL = 1000;
export const DAILY_REPORTS_PER_INSTALL = 20;
export const DAILY_EVENTS_GLOBAL = 20000;
export const DAILY_REPORTS_GLOBAL = 500;

export const BURST_PER_IP = { limit: 60, windowMs: 60_000 };
export const BURST_PER_INSTALL = { limit: 20, windowMs: 60_000 };

// The app mints a random UUID; accept any short id-like token, reject everything else.
const INSTALL_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
export function validInstallId(id: string | null): id is string {
  return id !== null && INSTALL_ID_RE.test(id);
}

/** Sliding-window counter keyed by string. Memory is bounded: oldest keys are dropped past maxKeys. */
export class BurstLimiter {
  private hits = new Map<string, number[]>();
  private maxKeys: number;
  constructor(maxKeys = 5000) {
    this.maxKeys = maxKeys;
  }

  /** Records a hit; returns false when the key is over `limit` within `windowMs`. */
  allow(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.delete(key); // re-insert so Map order tracks recency
    this.hits.set(key, recent);
    if (this.hits.size > this.maxKeys) {
      const oldest = this.hits.keys().next().value;
      if (oldest !== undefined) this.hits.delete(oldest);
    }
    return true;
  }
}

/** Client IP as seen by Supabase's edge proxy; "unknown" when absent (shares one bucket). */
export function clientIp(headers: Headers): string {
  const raw = headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for") ?? "";
  return raw.split(",")[0].trim() || "unknown";
}

/** Reads a request body as text, refusing anything larger than `max` bytes. Returns null if too large. */
export async function readLimitedText(req: Request, max = MAX_BODY_BYTES): Promise<string | null> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > max) return null;
  const text = await req.text();
  return new TextEncoder().encode(text).length > max ? null : text;
}

/** How many of `wanted` rows may still be inserted given the caps and current usage. */
export function allowedRows(wanted: number, usedInstall: number, capInstall: number, usedGlobal: number, capGlobal: number): number {
  return Math.max(0, Math.min(wanted, capInstall - usedInstall, capGlobal - usedGlobal));
}
