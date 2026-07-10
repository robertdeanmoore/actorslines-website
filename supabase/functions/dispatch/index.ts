// Bridge between the website and GitHub Actions on the (private) ActorsVoice repo.
// Fires a `repository_dispatch` event that starts one of the AI workflows.
//
// Callers (all must be signed in; plan/implement require the admin role):
//   { "action": "triage-report",       "request_id": 123, "turnstileToken": "..." }
//   { "action": "implementation-plan", "request_id": 123, "prompt": "...", "iteration": 2 }
//   { "action": "implement-pr",        "request_id": 123, "plan_path": "docs/plans/requests/123-v2.md" }
//
// Secrets (set with `supabase secrets set`, see SETUP.md):
//   GH_DISPATCH_TOKEN    — fine-grained PAT, contents:read/write on ActorsVoice
//   GH_REPO              — e.g. "robertdeanmoore/ActorsVoice"
//   TURNSTILE_SECRET_KEY — Cloudflare Turnstile secret key, verifies the
//                          triage-report action's turnstileToken server-side.

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ACTIONS = ["triage-report", "implementation-plan", "implement-pr"];

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
    const body = await req.json();
    action = body.action;
    request_id = body.request_id;
    const { prompt, iteration, plan_path, turnstileToken } = body;

    if (!ALLOWED_ACTIONS.includes(action ?? "")) return fail(400, "Unknown action");
    if (!Number.isInteger(request_id)) return fail(400, "request_id required");

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

    const { data: request } = await admin
      .from("enhancement_requests").select("id, author_id").eq("id", request_id).single();
    if (!request) return fail(404, "Request not found");

    if (action === "triage-report") {
      // The submitting user may trigger triage on their own request; admin on any.
      if (!isAdmin && request.author_id !== user.id) return fail(403, "Not your request");
      const captchaOk = await verifyTurnstile(
        turnstileToken,
        req.headers.get("cf-connecting-ip") ?? undefined,
      );
      if (!captchaOk) return fail(403, "Captcha verification failed");
    } else {
      if (!isAdmin) return fail(403, "Admin only");
    }

    let payload: Record<string, unknown> = { request_id };
    if (action === "implementation-plan") {
      if (typeof prompt !== "string" || prompt.length < 10) return fail(400, "prompt required");
      const it = Number.isInteger(iteration) ? iteration : 1;
      payload = { request_id, prompt, iteration: it };
      await admin.from("plans").insert({ request_id, iteration: it, prompt, status: "requested" });
    } else if (action === "implement-pr") {
      if (typeof plan_path !== "string" || !plan_path.startsWith("docs/plans/"))
        return fail(400, "plan_path required");
      payload = { request_id, plan_path };
    }

    const ghResp = await fetch(
      `https://api.github.com/repos/${Deno.env.get("GH_REPO")}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("GH_DISPATCH_TOKEN")}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ event_type: action, client_payload: payload }),
      },
    );
    if (!ghResp.ok) {
      const detail = await ghResp.text().catch(() => "");
      console.error(`[dispatch] github dispatch failed action=${action} request_id=${request_id} status=${ghResp.status} body=${detail.slice(0, 500)}`);
      return fail(502, `GitHub dispatch failed: ${ghResp.status}`);
    }

    console.log(`[dispatch] ok action=${action} request_id=${request_id} user=${user.id}`);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(`[dispatch] unhandled error action=${action ?? "unknown"} request_id=${request_id ?? "unknown"}`, e);
    return fail(500, e instanceof Error ? e.message : "Unexpected error");
  }
});
