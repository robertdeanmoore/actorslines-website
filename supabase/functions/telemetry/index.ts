// Anonymous, opt-in telemetry ingest for the Actors Lines Android app.
// See the ActorsVoice repo: docs/features/telemetry.md.
//
// Called directly by the app (no browser origin, no user login) with a shared secret header,
// exactly like the `lifecycle` function. Treats every request as untrusted: verifies the secret,
// then validates/clamps/allow-lists the payload before a service-role insert. The secret lives in
// the APK and is therefore extractable — so the hardening here (caps, allow-list, length clamps) is
// the real protection, not the secret.
//
// Secrets: TELEMETRY_SECRET (shared with the app's BuildConfig.TELEMETRY_SECRET).

import { createClient } from "jsr:@supabase/supabase-js@2";

// Usage-event names the app is allowed to send. Anything else is dropped on ingest.
const ALLOWED_EVENTS = new Set([
  "setting_changed",
  "feature_used",
  "app_open",
  "session_end",
]);

const MAX_EVENTS_PER_BATCH = 200;
const MAX_PARAMS_PER_EVENT = 8;
const MAX_STR = 200; // generic short-string clamp (install id, names, values, device class)
const MAX_TEXT = 2000; // recognised/expected script snippet clamp
const MAX_NOTE = 500;

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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const installId = clamp(body.installId, 64);
  if (!installId) return new Response("missing installId", { status: 400 });
  const appVersion = clamp(body.appVersion, 32);
  const deviceClass = clamp(body.deviceClass, MAX_STR);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (body.type === "events") {
      const raw = Array.isArray(body.events) ? body.events.slice(0, MAX_EVENTS_PER_BATCH) : [];
      const rows = raw
        .map((e) => e as Record<string, unknown>)
        .filter((e) => ALLOWED_EVENTS.has(String(e?.name)))
        .map((e) => ({
          install_id: installId,
          event_name: clamp(e.name, 64),
          params: cleanParams(e.params),
          app_version: appVersion,
          device_class: deviceClass,
        }));
      if (rows.length === 0) return new Response(JSON.stringify({ inserted: 0 }), { status: 200 });
      const { error } = await admin.from("telemetry_events").insert(rows);
      if (error) {
        console.error("[telemetry] event insert failed", error);
        return new Response("insert failed", { status: 500 });
      }
      return new Response(JSON.stringify({ inserted: rows.length }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (body.type === "recognition_report") {
      const kind = String(body.kind);
      if (kind !== "ocr" && kind !== "speech") return new Response("bad kind", { status: 400 });
      const confidence = typeof body.confidence === "number" ? body.confidence : null;
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
      return new Response(JSON.stringify({ inserted: 1 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("unknown type", { status: 400 });
  } catch (e) {
    console.error("[telemetry] unexpected error", e);
    return new Response("error", { status: 500 });
  }
});
