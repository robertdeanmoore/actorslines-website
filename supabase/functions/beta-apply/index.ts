// Public beta programme application (WIP #269 P1). Signed-out callers; no account is created.
//
//   POST { name, reason, email, same_google_email, google_email, town, actor_type, in_company,
//          company_name, consent, turnstileToken, website }
//   -> 200 { ok: true, status: "received" }   new pending application stored
//   -> 200 { ok: true, status: "already" }    a live or recent application exists (no second row, no email)
//
// Order: honeypot, validation, Turnstile, rate limits, insert, then emails. An email failure never
// loses the application (the row is written first; send failures are logged without addresses).
//
// Secrets (names only): TURNSTILE_SECRET_KEY, BREVO_API_KEY, MAIL_FROM, REQUEST_NOTIFY_EMAIL,
// IP_HASH_SALT (salts the rate-limit bucket names; unset: IP bucket fails closed to one shared
// bucket and the per-email bucket is skipped, same as notify-list).

import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  applicantReply, BETA_CAP, CONSENT_VERSION, notifyEmail, REPLY_TO, SITE_URL, validateApplication,
  withinReapplyWindow,
} from "./policy.ts";

const ALLOWED_ORIGINS = new Set(["https://actorslines.app", "https://www.actorslines.app"]);

const PER_IP_PER_HOUR = 3;
const PER_IP_PER_DAY = 10;
const PER_EMAIL_PER_DAY = 5;
const GLOBAL_PER_DAY = 200;

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : SITE_URL,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
}

async function verifyTurnstile(token: unknown, remoteip?: string): Promise<boolean> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) {
    console.error("[beta-apply] TURNSTILE_SECRET_KEY not configured: failing closed");
    return false;
  }
  if (typeof token !== "string" || token.length === 0) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (remoteip) body.set("remoteip", remoteip);
  try {
    const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!resp.ok) return false;
    return (await resp.json()).success === true;
  } catch {
    console.error("[beta-apply] siteverify request failed");
    return false;
  }
}

async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const [fromName, fromEmail] =
    (Deno.env.get("MAIL_FROM") ?? "Actors Lines <hello@actorslines.app>")
      .match(/^(.*) <(.*)>$/)?.slice(1) ?? ["Actors Lines", "hello@actorslines.app"];
  const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": Deno.env.get("BREVO_API_KEY") ?? "", "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      replyTo: { email: REPLY_TO },
      to: [{ email: to }],
      subject,
      textContent: text,
    }),
  });
  if (!resp.ok) {
    // Status only: the provider's response body can echo the recipient address.
    console.error(`[beta-apply] brevo send failed status=${resp.status}`);
  }
  return resp.ok;
}

/** Salted SHA-256 for rate-limit bucket names (never stored on a row). Null when no salt is set. */
async function saltedHash(value: string): Promise<string | null> {
  const salt = Deno.env.get("IP_HASH_SALT");
  if (!salt || !value) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}|${value}`));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (status: number, obj: unknown) =>
    new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
  const fail = (status: number, message: string) => {
    console.error(`[beta-apply] ${status} ${message}`);
    return json(status, { error: message });
  };
  if (req.method !== "POST") return fail(405, "Method not allowed");

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return fail(400, "Invalid request body");

    // Honeypot: a real visitor never fills the hidden field. Answer like a success, store nothing.
    if (typeof body.website === "string" && body.website.trim() !== "") return json(200, { ok: true, status: "received" });

    const checked = validateApplication(body);
    if (!checked.ok) return fail(400, checked.error);
    const app = checked.clean;

    const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "";
    if (!(await verifyTurnstile(body.turnstileToken, ip || undefined))) {
      return fail(403, "Captcha verification failed");
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const limitOk = async (bucket: string, max: number, window: string) => {
      const { data, error } = await admin.rpc("rate_limit_hit", { p_bucket: bucket, p_max: max, p_window: window });
      if (error) console.error("[beta-apply] rate_limit_hit failed");
      return !error && data === true;
    };
    const ipKey = (await saltedHash(ip)) ?? "shared";
    const emailKey = await saltedHash(app.email);
    const allowed = (await limitOk(`beta-ip-h:${ipKey}`, PER_IP_PER_HOUR, "1 hour")) &&
      (await limitOk(`beta-ip-d:${ipKey}`, PER_IP_PER_DAY, "1 day")) &&
      (emailKey === null || (await limitOk(`beta-email-d:${emailKey}`, PER_EMAIL_PER_DAY, "1 day"))) &&
      (await limitOk("beta-global-d", GLOBAL_PER_DAY, "1 day"));
    if (!allowed) return fail(429, "Too many applications right now. Please try again later.");

    // Duplicate rules (EC1.1, EC2.4): a pending or approved row blocks a second one; a rejected row
    // blocks it for 90 days, then a re-application is stored and linked to the earlier row.
    const { data: prior, error: priorErr } = await admin
      .from("beta_applications").select("id, status, decided_at").eq("email", app.email)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (priorErr) {
      console.error(`[beta-apply] prior lookup failed code=${priorErr.code ?? "unknown"}`);
      return fail(500, "Could not save your application");
    }
    if (prior && (prior.status === "pending" || prior.status === "approved" ||
        (prior.status === "rejected" && withinReapplyWindow(prior.decided_at)))) {
      return json(200, { ok: true, status: "already" });
    }

    // An address that already has an account is flagged for the admin; the applicant is not told.
    const { data: existing } = await admin.from("profiles").select("id").eq("email", app.email).limit(1).maybeSingle();

    const { data: created, error: insErr } = await admin
      .from("beta_applications")
      .insert({
        ...app,
        existing_user: Boolean(existing),
        reapplied: Boolean(prior),
        prior_application_id: prior?.id ?? null,
        consent_version: CONSENT_VERSION,
      })
      .select("id")
      .single();
    if (insErr || !created) {
      // 23505: a simultaneous submit won the one-live-application-per-address index.
      if (insErr?.code === "23505") return json(200, { ok: true, status: "already" });
      console.error(`[beta-apply] insert failed code=${insErr?.code ?? "unknown"}`);
      return fail(500, "Could not save your application");
    }

    const { count: used, error: countErr } = await admin
      .from("beta_applications").select("id", { count: "exact", head: true }).eq("status", "approved");
    if (countErr) console.error("[beta-apply] approved count failed");

    // Emails after the insert; waitUntil keeps the isolate alive, a failure is logged and nothing more.
    const sends: Promise<unknown>[] = [];
    const reply = applicantReply(app.name);
    sends.push(sendEmail(app.email, reply.subject, reply.text).catch(() => console.error("[beta-apply] reply email threw")));
    const notifyTo = Deno.env.get("REQUEST_NOTIFY_EMAIL");
    if (notifyTo) {
      const note = notifyEmail(app, created.id, used ?? 0);
      sends.push(sendEmail(notifyTo, note.subject, note.text).catch(() => console.error("[beta-apply] notify email threw")));
    } else {
      console.error("[beta-apply] REQUEST_NOTIFY_EMAIL not configured; skipping notification");
    }
    const all = Promise.all(sends);
    const edge = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime;
    if (edge) edge.waitUntil(all); else await all;

    console.log(`[beta-apply] ok id=${created.id} cap=${BETA_CAP}`);
    return json(200, { ok: true, status: "received" });
  } catch (e) {
    console.error("[beta-apply] unhandled error", e instanceof Error ? e.name : "unknown");
    return fail(500, "Unexpected error");
  }
});
