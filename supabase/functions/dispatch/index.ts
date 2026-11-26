// Member-facing request API: saves enhancement requests and runs the AI triage report.
// Triage calls OpenRouter directly from here (WIP #257); there is no GitHub bridge any more.
//
// Callers (all must be signed in):
//   { "action": "submit-request",      "turnstileToken": "...", "title": "...", "goal": "...",
//                                       "where_in_app": "...", "how_it_works": "...",
//                                       "usage_frequency": "...", "extra_notes": "...",
//                                       "kind": "enhancement" | "support" (optional, default enhancement) }
//        Saves the request (service role; clients cannot insert directly since migration 0024),
//        emails Robert, and starts triage in the background. One Turnstile token covers all of it.
//   { "action": "triage-report",       "request_id": 123, "turnstileToken": "..." }
//        Runs triage now and returns when the report is stored. Non-admins: own request, one
//        report only. Admins: any request, re-runnable, no captcha.
//
// Secrets (set with `supabase secrets set`, see SETUP.md):
//   OPENROUTER_API_KEY_TRIAGE — dedicated, spend-capped OpenRouter key (triage.ts holds the routing).
//   TURNSTILE_SECRET_KEY — Cloudflare Turnstile secret key, verifies the
//                          submit-request / triage-report turnstileToken server-side.
//   BREVO_API_KEY, MAIL_FROM — as in the invite/lifecycle functions.
//   REQUEST_NOTIFY_EMAIL — where "new enhancement request" emails go (Robert's inbox). If unset
//                          the email is skipped with a log line; the request still saves.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { captchaRequired, kindLabel, parseKind, TRIAGE_REQUEST_WINDOW, triageRequestBucket } from "./policy.ts";
import { FAILURE_PREFIX, runTriage, type TriageDeps } from "./triage.ts";

const ALLOWED_ACTIONS = ["submit-request", "triage-report"];
const SITE_URL = "https://actorslines.app";

// Limits mirror the CHECK constraints in migrations 0001 and 0024.
const LIMITS = { title: [5, 80], goal: [30, 2000], where_in_app: [10, 300], how_it_works: [30, 2000],
  usage_frequency: [0, 100], extra_notes: [0, 2000] } as const;
const FREQUENCIES = ["", "Every session", "Most sessions", "Occasionally", "Rarely, but it matters when I need it"];

// Per-user limits for non-admins (sliding window, enforced by public.rate_limit_hit).
const SUBMIT_PER_HOUR = 3;
const SUBMIT_PER_DAY = 10;
const TRIAGE_PER_HOUR = 6;

/** True when the hit is allowed. Fails closed if the limiter itself errors. */
async function rateLimitOk(
  admin: ReturnType<typeof createClient>, bucket: string, max: number, windowSql: string,
): Promise<boolean> {
  const { data, error } = await admin.rpc("rate_limit_hit", { p_bucket: bucket, p_max: max, p_window: windowSql });
  if (error) {
    console.error(`[dispatch] rate_limit_hit failed bucket=${bucket}`, error);
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
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to }],
      subject,
      textContent: text,
    }),
  });
  if (!resp.ok) {
    console.error(`[dispatch] brevo send failed subject="${subject}" status=${resp.status}`);
  }
  return resp.ok;
}

function triageDeps(admin: ReturnType<typeof createClient>): TriageDeps {
  const failureLike = `${FAILURE_PREFIX}%`;
  const must = <T>(r: { data: T; error: unknown }): T => {
    if (r.error) throw new Error("db");
    return r.data;
  };
  return {
    fetch,
    apiKey: Deno.env.get("OPENROUTER_API_KEY_TRIAGE") ?? "",
    loadRequest: async (id) => must(await admin.from("enhancement_requests")
      .select("id, kind, title, goal, where_in_app, how_it_works, usage_frequency, extra_notes")
      .eq("id", id).maybeSingle()) as never,
    loadOthers: async (id) => {
      const { data, error } = await admin.from("enhancement_requests").select("id, title, goal")
        .neq("id", id).order("created_at", { ascending: false }).limit(200);
      return error ? null : (data as { id: number; title: string; goal: string }[]);
    },
    countSuccessfulReports: async (id) => {
      const { count, error } = await admin.from("ai_reports").select("id", { count: "exact", head: true })
        .eq("request_id", id).not("report_md", "like", failureLike);
      if (error) throw new Error("db");
      return count ?? 0;
    },
    countFailureReports: async (id) => {
      const { count, error } = await admin.from("ai_reports").select("id", { count: "exact", head: true })
        .eq("request_id", id).like("report_md", failureLike);
      if (error) throw new Error("db");
      return count ?? 0;
    },
    saveReport: async (row) => { must(await admin.from("ai_reports").insert(row)); },
    markReported: async (id) => {
      must(await admin.from("enhancement_requests").update({ status: "reported" }).eq("id", id).eq("status", "submitted"));
    },
  };
}

// The live site is reachable at both the bare and www domains (neither redirects to the
// other), so CORS must allow whichever one the request actually came from.
const ALLOWED_ORIGINS = new Set(["https://actorslines.app", "https://www.actorslines.app"]);

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://actorslines.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
}

/** Verifies a Turnstile token against Cloudflare's siteverify endpoint.
 *  Fails closed: returns false if the secret isn't configured, the token is
 *  missing, the network call fails, or Cloudflare says the token is invalid. */
async function verifyTurnstile(token: unknown, remoteip?: string): Promise<boolean> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) {
    console.error("[dispatch] TURNSTILE_SECRET_KEY not configured — failing closed");
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
    if (!resp.ok) {
      console.error(`[dispatch] siteverify http ${resp.status}`);
      return false;
    }
    const result = await resp.json();
    if (!result.success) {
      console.error(`[dispatch] siteverify rejected: ${JSON.stringify(result["error-codes"] ?? [])}`);
    }
    return result.success === true;
  } catch (e) {
    console.error("[dispatch] siteverify request failed", e);
    return false;
  }
}

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const fail = (status: number, message: string) => {
    console.error(`[dispatch] ${status} ${message}`);
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  };

  let action: string | undefined;
  let request_id: number | undefined;

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return fail(400, "Invalid request body");
    action = body.action;
    request_id = body.request_id;
    const { turnstileToken } = body;

    if (!ALLOWED_ACTIONS.includes(action ?? "")) return fail(400, "Unknown action");
    if (action !== "submit-request" && !Number.isInteger(request_id)) return fail(400, "request_id required");

    // Identify the caller from their JWT.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return fail(401, "Not signed in");

    // Service-role client for privileged checks and writes.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: profile } = await admin
      .from("profiles").select("role").eq("id", user.id).single();
    const isAdmin = profile?.role === "admin";

    if (action === "submit-request") {
      const kind = parseKind(body.kind);
      if (!kind) return fail(400, 'Field "kind" must be "enhancement" or "support"');
      const clean: Record<string, string> = {};
      for (const [key, [min, max]] of Object.entries(LIMITS)) {
        const v = typeof body[key] === "string" ? body[key].trim() : "";
        if (v.length < min || v.length > max) return fail(400, `Field "${key}" must be ${min}-${max} characters`);
        clean[key] = v;
      }
      if (!FREQUENCIES.includes(clean.usage_frequency)) return fail(400, "Unknown usage_frequency");

      const captchaOk = await verifyTurnstile(turnstileToken, req.headers.get("cf-connecting-ip") ?? undefined);
      if (!captchaOk) return fail(403, "Captcha verification failed");

      if (!isAdmin) {
        const ok = await rateLimitOk(admin, `submit-h:${user.id}`, SUBMIT_PER_HOUR, "1 hour")
          && await rateLimitOk(admin, `submit-d:${user.id}`, SUBMIT_PER_DAY, "1 day");
        if (!ok) return fail(429, "Too many suggestions in a short time. Please try again later.");
      }

      const { data: created, error: insErr } = await admin
        .from("enhancement_requests").insert({ author_id: user.id, kind, ...clean }).select("id").single();
      if (insErr || !created) {
        console.error(`[dispatch] request insert failed code=${insErr?.code ?? "unknown"}`);
        return fail(500, "Could not save your suggestion");
      }

      // Tell Robert. A mail failure must never lose the request.
      const notify = Deno.env.get("REQUEST_NOTIFY_EMAIL");
      if (notify) {
        const subjectTitle = clean.title.replace(/[\r\n]+/g, " ").slice(0, 80);
        await sendEmail(
          notify,
          `New ${kindLabel(kind).toLowerCase()} request #${created.id} [${kindLabel(kind)}]: ${subjectTitle}`,
          `A member submitted a new ${kindLabel(kind).toLowerCase()} request.\n\nType: ${kindLabel(kind)}\nTitle: ${clean.title}\n\n` +
          `Goal: ${clean.goal.slice(0, 600)}\n\nReview it: ${SITE_URL}/admin/requests/${created.id}\n`,
        ).catch((e) => console.error("[dispatch] notify email threw", e));
      } else {
        console.error("[dispatch] REQUEST_NOTIFY_EMAIL not configured; skipping new-request email");
      }

      // Start triage in the background so the member is not kept waiting. The per-request guard
      // slot stops a second run racing this one; any failure leaves a visible marker report.
      await rateLimitOk(admin, triageRequestBucket(created.id), 1, TRIAGE_REQUEST_WINDOW);
      const job = runTriage(triageDeps(admin), created.id, { isAdmin: false })
        .catch((e) => console.error("[dispatch] background triage threw", e instanceof Error ? e.name : "unknown"));
      const edge = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime;
      if (edge) edge.waitUntil(job); else await job;
      const triageStarted = true;
      console.log(`[dispatch] ok action=submit-request request_id=${created.id} user=${user.id}`);
      return new Response(JSON.stringify({ ok: true, request_id: created.id, triage_started: triageStarted }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: request } = await admin
      .from("enhancement_requests").select("id, author_id").eq("id", request_id).single();
    if (!request) return fail(404, "Request not found");

    if (action === "triage-report") {
      // The submitting user may trigger triage on their own request; admin on any.
      if (!isAdmin && request.author_id !== user.id) return fail(403, "Not your request");
      // Admins are authenticated by JWT plus the server-side role lookup above, so they skip
      // the captcha here (the admin page has no Turnstile widget). Everyone else still needs it.
      if (captchaRequired(action!, isAdmin)) {
        const captchaOk = await verifyTurnstile(
          turnstileToken,
          req.headers.get("cf-connecting-ip") ?? undefined,
        );
        if (!captchaOk) return fail(403, "Captcha verification failed");
      }
      if (!isAdmin && !(await rateLimitOk(admin, `triage-h:${user.id}`, TRIAGE_PER_HOUR, "1 hour")))
        return fail(429, "Too many triage requests. Please try again later.");
      // Duplicate-run guard: one manual run per request per window. Released below if the run fails.
      if (!(await rateLimitOk(admin, triageRequestBucket(request_id!), 1, TRIAGE_REQUEST_WINDOW)))
        return fail(429, "A triage run was started for this request a few minutes ago. Wait 5 minutes, then try again.");
    }

    const result = await runTriage(triageDeps(admin), request_id!, { isAdmin });
    if (!result.ok) {
      // A refused or failed run must not hold the duplicate-guard slot: free it for a retry.
      if (result.code !== "already_reported") {
        await admin.from("rate_limit_events").delete().eq("bucket", triageRequestBucket(request_id!))
          .then(({ error }) => { if (error) console.error("[dispatch] guard release failed", error); });
      }
      if (result.code === "already_reported") return fail(409, "This request already has an AI report.");
      if (result.code === "too_many_failures") return fail(429, "The AI report keeps failing for this request. Please contact the team.");
      return fail(502, `AI report failed (${result.code})`);
    }

    console.log(`[dispatch] ok action=${action} request_id=${request_id} user=${user.id}`);
    return new Response(JSON.stringify({ ok: true, verdict: result.verdict }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(`[dispatch] unhandled error action=${action ?? "unknown"} request_id=${request_id ?? "unknown"}`, e);
    return fail(500, "Unexpected error");
  }
});
