// Anonymous, opt-in telemetry ingest for the Actors Lines Android app.
// See the ActorsVoice repo: docs/features/telemetry.md.
//
// Called directly by the app (no browser origin, no user login) with a shared secret header,
// exactly like the `lifecycle` function. Treats every request as untrusted: verifies the secret,
// then validates/clamps/allow-lists the payload before a service-role insert. The secret lives in
// the APK and is therefore extractable — so the hardening here (size/rate/daily caps in limits.ts, allow-list,
// length clamps) is the real protection, not the secret.
//
// Secrets: TELEMETRY_SECRET (shared with the app's BuildConfig.TELEMETRY_SECRET).

import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  allowedRows,
  BURST_PER_INSTALL,
  BURST_PER_IP,
  BurstLimiter,
  clientIp,
  DAILY_EVENTS_GLOBAL,
  DAILY_EVENTS_PER_INSTALL,
  DAILY_REPORTS_GLOBAL,
  DAILY_REPORTS_PER_INSTALL,
  MAX_EVENTS_PER_BATCH,
  readLimitedText,
  validInstallId,
} from "./limits.ts";

// Usage-event names the app is allowed to send. Anything else is dropped on ingest.
const ALLOWED_EVENTS = new Set([
  "setting_changed",
  "feature_used",
  "app_open",
  "session_end",
]);

const MAX_PARAMS_PER_EVENT = 8;
const MAX_STR = 200; // generic short-string clamp (install id, names, values, device class)
const MAX_TEXT = 2000; // recognised/expected script snippet clamp
const MAX_NOTE = 500;

const burst = new BurstLimiter();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// Rows already stored in the last 24 h for one install and in total (served by the install_id and
// received_at indexes from 0017_telemetry.sql). Returns null if the count could not be read.
async function usage(
  admin: ReturnType<typeof createClient>,
  table: "telemetry_events" | "recognition_reports",
  installId: string,
): Promise<{ install: number; global: number } | null> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [i, g] = await Promise.all([
    admin.from(table).select("id", { count: "exact", head: true }).eq("install_id", installId).gte("received_at", since),
    admin.from(table).select("id", { count: "exact", head: true }).gte("received_at", since),
  ]);
  if (i.error || g.error) {
    console.error("[telemetry] usage count failed", i.error ?? g.error);
    return null;
  }
  return { install: i.count ?? 0, global: g.count ?? 0 };
}

function clamp(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t.slice(0, max);
}

// A small map of short string params, capped in count and length; anything non-string is dropped.
function cleanParams(input: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!input || typeof input !== "object") return out;
  let n = 0;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (n >= MAX_PARAMS_PER_EVENT) break;
    const key = clamp(k, 64);
    const val = clamp(v, MAX_STR);
    if (key && val) {
      out[key] = val;
      n++;
    }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const secret = req.headers.get("x-telemetry-secret");
  if (!secret || secret !== Deno.env.get("TELEMETRY_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }

  if (!burst.allow(`ip:${clientIp(req.headers)}`, BURST_PER_IP.limit, BURST_PER_IP.windowMs)) {
    return new Response("too many requests", { status: 429, headers: { "Retry-After": "60" } });
  }

  const text = await readLimitedText(req);
  if (text === null) return new Response("payload too large", { status: 413 });

  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed;
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const installId = clamp(body.installId, 64);
  if (!validInstallId(installId)) return new Response("missing or invalid installId", { status: 400 });
  if (!burst.allow(`install:${installId}`, BURST_PER_INSTALL.limit, BURST_PER_INSTALL.windowMs)) {
    return new Response("too many requests", { status: 429, headers: { "Retry-After": "60" } });
  }
  const appVersion = clamp(body.appVersion, 32);
  const deviceClass = clamp(body.deviceClass, MAX_STR);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (body.type === "events") {
      const all = Array.isArray(body.events) ? body.events : [];
      if (all.length > MAX_EVENTS_PER_BATCH) return new Response("too many events", { status: 413 });
      const rows = all
        .map((e) => e as Record<string, unknown>)
        .filter((e) => ALLOWED_EVENTS.has(String(e?.name)))
        .map((e) => ({
          install_id: installId,
          event_name: clamp(e.name, 64),
          params: cleanParams(e.params),
          app_version: appVersion,
          device_class: deviceClass,
        }));
      if (rows.length === 0) return json({ inserted: 0 });
      // Over a daily cap: answer 200 with nothing stored, so the shipped app drops the batch
      // instead of retrying it forever (it keeps rows queued on any non-2xx).
      const used = await usage(admin, "telemetry_events", installId);
      if (!used) return new Response("try again later", { status: 503 });
      const room = allowedRows(rows.length, used.install, DAILY_EVENTS_PER_INSTALL, used.global, DAILY_EVENTS_GLOBAL);
      if (room === 0) {
        if (used.global >= DAILY_EVENTS_GLOBAL) console.warn("[telemetry] global daily event cap hit");
        return json({ inserted: 0, dropped: "daily_cap" });
      }
      const { error } = await admin.from("telemetry_events").insert(rows.slice(0, room));
      if (error) {
        console.error("[telemetry] event insert failed", error);
        return new Response("insert failed", { status: 500 });
      }
      return json({ inserted: room });
    }

    if (body.type === "recognition_report") {
      const kind = String(body.kind);
      if (kind !== "ocr" && kind !== "speech") return new Response("bad kind", { status: 400 });
      const confidence = typeof body.confidence === "number" && Number.isFinite(body.confidence) ? body.confidence : null;
      const used = await usage(admin, "recognition_reports", installId);
      if (!used) return new Response("try again later", { status: 503 });
      if (allowedRows(1, used.install, DAILY_REPORTS_PER_INSTALL, used.global, DAILY_REPORTS_GLOBAL) === 0) {
        if (used.global >= DAILY_REPORTS_GLOBAL) console.warn("[telemetry] global daily report cap hit");
        return json({ inserted: 0, dropped: "daily_cap" });
      }
      const { error } = await admin.from("recognition_reports").insert({
        install_id: installId,
        kind,
        recognized_text: clamp(body.recognizedText, MAX_TEXT),
        expected_text: clamp(body.expectedText, MAX_TEXT),
        engine: clamp(body.engine, 40),
        confidence,
        note: clamp(body.note, MAX_NOTE),
        app_version: appVersion,
        device_class: deviceClass,
      });
      if (error) {
        console.error("[telemetry] report insert failed", error);
        return new Response("insert failed", { status: 500 });
      }
      return json({ inserted: 1 });
    }

    return new Response("unknown type", { status: 400 });
  } catch (e) {
    console.error("[telemetry] unexpected error", e);
    return new Response("error", { status: 500 });
  }
});
