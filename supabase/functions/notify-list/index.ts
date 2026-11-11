// "On iPhone? Get notified" opt-in list (WIP #257 row 1.8). Public, signed-out callers.
//
// Actions (all POST JSON):
//   { "action": "subscribe",   "email": "...", "consent": true, "turnstileToken": "..." }
//        Stores an UNCONFIRMED row and emails a confirm link (double opt-in). The response is the
//        same whether or not the address was already known, so it cannot be used to probe the list.
//   { "action": "confirm",     "token": "<uuid>" }       link in the confirmation email
//   { "action": "unsubscribe", "token": "<uuid>" }       link in the confirmation email; DELETES the row
//
// Secrets: TURNSTILE_SECRET_KEY, BREVO_API_KEY, MAIL_FROM (as invite/lifecycle),
//          IP_HASH_SALT (random string; salts the IP hash used only as a rate-limit bucket name,
//          never stored on a sign-up row). If unset the per-IP limit fails closed to one shared bucket.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SITE_URL = "https://actorslines.app";
const ALLOWED_ORIGINS = new Set(["https://actorslines.app", "https://www.actorslines.app"]);

// The exact wording shown beside the form; stored with each row as the record of consent.
const CONSENT_TEXT =
  "Email me a confirmation link now, then one email if an iPhone version of Actors Lines becomes available. No other emails. Unsubscribe any time.";

const MAX_EMAIL = 254;
// Pragmatic format check; the confirmation email is the real proof the address works.
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PER_IP_PER_HOUR = 5;
const GLOBAL_PER_HOUR = 100;

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
    console.error("[notify-list] TURNSTILE_SECRET_KEY not configured: failing closed");
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
  } catch (e) {
    console.error("[notify-list] siteverify request failed", e);
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
      to: [{ email: to }],
      subject,
      textContent: text,
    }),
  });
  if (!resp.ok) {
    // Status only: the provider's response body can echo the recipient address.
    console.error(`[notify-list] brevo send failed status=${resp.status}`);
  }
  return resp.ok;
}

/** Salted IP hash for the rate-limit bucket name. Without a salt, never hash (fixed shared bucket). */
async function ipBucketKey(ip: string): Promise<string> {
  const salt = Deno.env.get("IP_HASH_SALT");
  if (!salt || !ip) {
    if (!salt) console.error("[notify-list] IP_HASH_SALT not configured: using one shared rate-limit bucket");
    return "shared";
  }
  const data = new TextEncoder().encode(`${salt}|${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (status: number, obj: unknown) =>
    new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
  const fail = (status: number, message: string) => {
    console.error(`[notify-list] ${status} ${message}`);
    return json(status, { error: message });
  };
  if (req.method !== "POST") return fail(405, "Method not allowed");

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return fail(400, "Invalid request body");
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (body.action === "confirm" || body.action === "unsubscribe") {
      const token = typeof body.token === "string" ? body.token : "";
      if (!UUID_RE.test(token)) return fail(400, "Invalid link");
      const { data, error } = body.action === "confirm"
        ? await admin.from("notify_signups").update({ confirmed_at: new Date().toISOString() })
          .eq("token", token).select("id")
        : await admin.from("notify_signups").delete().eq("token", token).select("id");
      if (error) {
        console.error(`[notify-list] ${body.action} failed code=${error.code ?? "unknown"}`);
        return fail(500, "Could not update");
      }
      if (!data || data.length === 0) return fail(404, "This link is not valid any more");
      return json(200, { ok: true });
    }

    if (body.action !== "subscribe") return fail(400, "Unknown action");

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email.length < 6 || email.length > MAX_EMAIL || !EMAIL_RE.test(email)) {
      return fail(400, "Please enter a valid email address");
    }
    if (body.consent !== true) return fail(400, "Please tick the box to agree");

    const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "";
    if (!(await verifyTurnstile(body.turnstileToken, ip || undefined))) {
      return fail(403, "Captcha verification failed");
    }

    const ipKey = await ipBucketKey(ip);
    const limitOk = async (bucket: string, max: number) => {
      const { data, error } = await admin.rpc("rate_limit_hit", { p_bucket: bucket, p_max: max, p_window: "1 hour" });
      if (error) console.error("[notify-list] rate_limit_hit failed", error);
      return !error && data === true;
    };
    if (!(await limitOk(`notify-ip:${ipKey}`, PER_IP_PER_HOUR)) || !(await limitOk("notify-global", GLOBAL_PER_HOUR))) {
      return fail(429, "Too many sign-ups right now. Please try again later.");
    }

    // Insert; if the address is already on the list, do nothing visible (no probing).
    const { data: inserted, error: insErr } = await admin
      .from("notify_signups")
      .insert({ email, consent_text: CONSENT_TEXT })
      .select("token")
      .single();
    if (insErr && insErr.code !== "23505") {
      console.error(`[notify-list] insert failed code=${insErr.code ?? "unknown"}`);
      return fail(500, "Could not save your address");
    }
    if (inserted) {
      const base = `${SITE_URL}/notify`;
      // Not awaited (so a new and an already-known address answer in the same time);
      // waitUntil keeps the isolate alive until the send finishes.
      const send = sendEmail(
        email,
        "Confirm: tell me when Actors Lines is on iPhone",
        `Someone (hopefully you) asked to be told when Actors Lines is available on iPhone.\n\n` +
        `Actors Lines is on Android now; an iPhone version is being explored and is not promised.\n\n` +
        `To confirm, open: ${base}/confirm/${inserted.token}\n\n` +
        `If this was not you, ignore this email and nothing more will be sent.\n` +
        `To remove your address at any time: ${base}/unsubscribe/${inserted.token}\n\n- Actors Lines`,
      ).catch(() => console.error("[notify-list] confirm email threw"));
      (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime?.waitUntil(send);
    }
    return json(200, { ok: true });
  } catch (e) {
    console.error("[notify-list] unhandled error", e instanceof Error ? e.name : "unknown");
    return fail(500, "Unexpected error");
  }
});
