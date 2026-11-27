// App-facing report API (WIP #269 P4.2, migrations 0040 to 0042). Called by the Android app with the
// member's own JWT; there is no Turnstile in the app, so the limits are per user (5 an hour, 20 a day).
//
//   { "action": "submit", "kind": "support"|"enhancement", "subject": "...", "description": "...",
//     "app_version": "...", "device_model": "...", "android_sdk": 34,
//     "attachments": [ { "kind": "image"|"audio", "mime": "image/png", "size": 12345 } ] }
//        Saves the report (service role) and returns one signed upload URL per declared attachment.
//        The request is visible to the admin at once; attachments_complete stays false until `confirm`.
//   { "action": "confirm", "request_id": 123 }
//        Checks each uploaded file (size and magic bytes against its declared type), removes any that
//        fail, and marks the request complete when every declared file arrived and passed.
//   { "action": "upload-urls", "request_id": 123 }
//        New signed upload URLs for the files not yet confirmed (a retry reuses the same request id).
//        Only this retry may overwrite an existing object; the first issue never can.
//
// After the insert, `submit` asks dispatch to triage the report (`triage-app`, service-role key, id only).
// Nothing from an attachment is sent to AI triage (decision D8). An expired or withdrawn licence does
// not stop a report (decision D3): only a signed-in, existing account is required.
// Secrets: BREVO_API_KEY, MAIL_FROM, REQUEST_NOTIFY_EMAIL (as in dispatch). Self-contained: imports
// nothing from outside this directory.

import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  CONFIRM_PER_HOUR, UPLOAD_URLS_PER_HOUR, SUBMIT_PER_DAY, SUBMIT_PER_HOUR,
  checkUploadedFile, confirmBucket, duplicateSinceIso, isDuplicateWithin, kindLabel, mayReport,
  storagePathFor, submitBuckets, toRequestRow, uploadUrlsBucket, upsertForAction, validateSubmit,
  type AttachmentKind, type RequestKind,
} from "./policy.ts";

const BUCKET = "request-attachments";
const SITE_URL = "https://actorslines.app";
const ALLOWED_ACTIONS = ["submit", "confirm", "upload-urls"];

type Admin = ReturnType<typeof createClient>;

/** True when the hit is allowed. Fails closed if the limiter itself errors. */
async function rateLimitOk(admin: Admin, bucket: string, max: number, windowSql: string): Promise<boolean> {
  const { data, error } = await admin.rpc("rate_limit_hit", { p_bucket: bucket, p_max: max, p_window: windowSql });
  if (error) {
    console.error(`[submit-request-app] rate_limit_hit failed code=${error.code ?? "unknown"}`);
    return false;
  }
  return data === true;
}

async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const [fromName, fromEmail] =
    (Deno.env.get("MAIL_FROM") ?? "Actors Lines <hello@actorslines.app>")
      .match(/^(.*) <(.*)>$/)?.slice(1) ?? ["Actors Lines", "hello@actorslines.app"];
  const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": Deno.env.get("BREVO_API_KEY") ?? "", "Content-Type": "application/json" },
    body: JSON.stringify({ sender: { name: fromName, email: fromEmail }, to: [{ email: to }], subject, textContent: text }),
  });
  if (!resp.ok) console.error(`[submit-request-app] brevo send failed status=${resp.status}`);
  return resp.ok;
}

type AttachmentRow = { id: number; kind: AttachmentKind; declared_mime: string; declared_size: number; storage_path: string };

/** Fresh signed upload URLs for the not-yet-confirmed files of a request. Never throws. */
async function uploadsFor(admin: Admin, requestId: number, upsert: boolean): Promise<{ uploads: unknown[]; failed: number }> {
  const { data } = await admin.from("request_attachments")
    .select("id, kind, declared_mime, declared_size, storage_path")
    .eq("request_id", requestId).eq("status", "pending").order("id");
  const uploads: unknown[] = [];
  let failed = 0;
  for (const a of (data ?? []) as AttachmentRow[]) {
    const { data: signed, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(a.storage_path, { upsert });
    if (error || !signed) {
      console.error(`[submit-request-app] signed upload url failed attachment=${a.id}`);
      failed++;
      continue;
    }
    uploads.push({
      attachment_id: a.id, kind: a.kind, content_type: a.declared_mime, max_bytes: a.declared_size,
      path: a.storage_path, signed_url: signed.signedUrl, token: signed.token,
    });
  }
  return { uploads, failed };
}

Deno.serve(async (req) => {
  const json = (status: number, payload: unknown) =>
    new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
  const fail = (status: number, message: string) => {
    console.error(`[submit-request-app] ${status} ${message}`);
    return json(status, { error: message });
  };
  if (req.method !== "POST") return fail(405, "POST only");

  let action: string | undefined;
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return fail(400, "Invalid request body");
    action = body.action;
    if (!ALLOWED_ACTIONS.includes(action ?? "")) return fail(400, "Unknown action");

    // Identify the caller from their JWT. No JWT or an invalid one: 401, nothing else runs.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!mayReport(user)) return fail(401, "Not signed in");
    const userId = user!.id;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (action === "submit") {
      const v = validateSubmit(body);
      if (!v.ok) return fail(400, v.error);
      const report = v.value;

      // Double tap (EC3.1): same author, subject and description within 2 minutes returns the same
      // request. Checked before the rate limit so a double tap does not use up a slot.
      const { data: dupe } = await admin.from("enhancement_requests").select("id, created_at")
        .eq("author_id", userId).eq("source", "app").eq("title", report.subject).eq("goal", report.description)
        .gte("created_at", duplicateSinceIso(Date.now())).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (dupe && isDuplicateWithin(dupe.created_at, Date.now())) {
        const again = await uploadsFor(admin, dupe.id, upsertForAction("submit"));
        return json(200, { ok: true, request_id: dupe.id, duplicate: true, uploads: again.uploads });
      }

      const buckets = submitBuckets(userId);
      const allowed = await rateLimitOk(admin, buckets.hour, SUBMIT_PER_HOUR, "1 hour")
        && await rateLimitOk(admin, buckets.day, SUBMIT_PER_DAY, "1 day");
      if (!allowed) return fail(429, "Too many reports in a short time. Please try again later.");

      const { data: created, error: insErr } = await admin
        .from("enhancement_requests").insert(toRequestRow(userId, report)).select("id").single();
      if (insErr || !created) {
        console.error(`[submit-request-app] request insert failed code=${insErr?.code ?? "unknown"}`);
        return fail(500, "Could not save your report");
      }

      let attachmentRowsFailed = 0;
      for (const a of report.attachments) {
        const path = storagePathFor(created.id, crypto.randomUUID(), a.mime);
        const { error } = path
          ? await admin.from("request_attachments").insert({
            request_id: created.id, owner_id: userId, kind: a.kind, declared_mime: a.mime, declared_size: a.size, storage_path: path,
          })
          : { error: { code: "bad_path" } };
        if (error) {
          console.error(`[submit-request-app] attachment row failed code=${error.code ?? "unknown"}`);
          attachmentRowsFailed++;
        }
      }
      const { uploads, failed } = await uploadsFor(admin, created.id, upsertForAction("submit"));

      // AC4.8: start AI triage for this report. Server-to-server call to dispatch `triage-app`, proven by
      // the service-role key. Only the request id is sent: nothing from an attachment reaches triage (D8).
      // Fire and forget: a triage failure is logged by code only and never loses the report.
      const triageJob = fetch(`${Deno.env.get("SUPABASE_URL")!}/functions/v1/dispatch`, {
        method: "POST",
        headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "triage-app", request_id: created.id }),
      }).then((r) => {
        if (!r.ok) console.error(`[submit-request-app] triage start failed status=${r.status}`);
        return r.body?.cancel();
      }).catch(() => console.error("[submit-request-app] triage start threw"));
      const edge = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime;
      if (edge) edge.waitUntil(triageJob); else await triageJob;

      // Tell Robert. A mail failure must never lose the report.
      const notify = Deno.env.get("REQUEST_NOTIFY_EMAIL");
      if (notify) {
        const label = kindLabel(report.kind as RequestKind);
        const subjectLine = report.subject.replace(/[\r\n]+/g, " ").slice(0, 80);
        await sendEmail(
          notify,
          `New ${label.toLowerCase()} request #${created.id} [${label}] (app): ${subjectLine}`,
          `A tester sent a report from the Android app.\n\nType: ${label}\nSubject: ${report.subject}\n` +
          `Attachments declared: ${report.attachments.length}\n\n${report.description.slice(0, 600)}\n\n` +
          `Review it: ${SITE_URL}/admin/requests/${created.id}\n`,
        ).catch(() => console.error("[submit-request-app] notify email threw"));
      } else {
        console.error("[submit-request-app] REQUEST_NOTIFY_EMAIL not configured; skipping notify email");
      }

      console.log(`[submit-request-app] ok action=submit request_id=${created.id} attachments=${report.attachments.length}`);
      return json(200, {
        ok: true, request_id: created.id, duplicate: false, uploads,
        upload_problems: attachmentRowsFailed + failed,
      });
    }

    // confirm and upload-urls act on the caller's own request only; anything else looks like "not found".
    const requestId = body.request_id;
    if (!Number.isInteger(requestId) || requestId <= 0) return fail(400, "request_id required");
    const { data: own } = await admin.from("enhancement_requests").select("id")
      .eq("id", requestId).eq("author_id", userId).eq("source", "app").maybeSingle();
    if (!own) return fail(404, "Request not found");

    if (action === "upload-urls") {
      if (!(await rateLimitOk(admin, uploadUrlsBucket(userId), UPLOAD_URLS_PER_HOUR, "1 hour"))) {
        return fail(429, "Too many attempts. Please try again later.");
      }
      const { uploads, failed } = await uploadsFor(admin, requestId, upsertForAction("upload-urls"));
      return json(200, { ok: true, request_id: requestId, uploads, upload_problems: failed });
    }

    // confirm
    if (!(await rateLimitOk(admin, confirmBucket(userId), CONFIRM_PER_HOUR, "1 hour"))) {
      return fail(429, "Too many attempts. Please try again later.");
    }
    const { data: rows } = await admin.from("request_attachments")
      .select("id, kind, declared_mime, declared_size, storage_path, status").eq("request_id", requestId).order("id");
    const confirmed: string[] = [];
    const rejected: string[] = [];
    const missing: string[] = [];
    let unconfirmed = 0;
    for (const a of (rows ?? []) as (AttachmentRow & { status: string })[]) {
      if (a.status === "confirmed") { confirmed.push(a.kind); continue; }
      if (a.status === "rejected") { rejected.push(a.kind); continue; }
      const { data: file, error: dlErr } = await admin.storage.from(BUCKET).download(a.storage_path);
      if (dlErr || !file) { missing.push(a.kind); unconfirmed++; continue; }
      const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
      const verdict = checkUploadedFile({ kind: a.kind, mime: a.declared_mime, size: a.declared_size }, head, file.size);
      if (verdict.ok) {
        await admin.from("request_attachments").update({ status: "confirmed", confirmed_at: new Date().toISOString() }).eq("id", a.id);
        confirmed.push(a.kind);
      } else {
        // AC4.7: a file that does not match its declared type or size is removed and never served.
        const { error: rmErr } = await admin.storage.from(BUCKET).remove([a.storage_path]);
        if (rmErr) console.error(`[submit-request-app] remove failed attachment=${a.id}`);
        await admin.from("request_attachments").update({ status: "rejected" }).eq("id", a.id);
        console.error(`[submit-request-app] file refused attachment=${a.id} reason=${verdict.reason}`);
        rejected.push(a.kind);
      }
    }
    const complete = unconfirmed === 0 && rejected.length === 0;
    await admin.from("enhancement_requests").update({ attachments_complete: complete }).eq("id", requestId);
    console.log(`[submit-request-app] ok action=confirm request_id=${requestId} complete=${complete}`);
    return json(200, { ok: true, request_id: requestId, attachments_complete: complete, confirmed, rejected, missing });
  } catch (e) {
    console.error(`[submit-request-app] unhandled error action=${action ?? "unknown"}`, e instanceof Error ? e.name : "unknown");
    return fail(500, "Unexpected error");
  }
});
