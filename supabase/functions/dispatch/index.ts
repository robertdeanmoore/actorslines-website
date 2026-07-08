// Bridge between the website and GitHub Actions on the (private) ActorsVoice repo.
// Fires a `repository_dispatch` event that starts one of the AI workflows.
//
// Callers (all must be signed in; plan/implement require the admin role):
//   { "action": "triage-report",       "request_id": 123 }
//   { "action": "implementation-plan", "request_id": 123, "prompt": "...", "iteration": 2 }
//   { "action": "implement-pr",        "request_id": 123, "plan_path": "docs/plans/requests/123-v2.md" }
//
// Secrets (set with `supabase secrets set`, see SETUP.md):
//   GH_DISPATCH_TOKEN — fine-grained PAT, contents:read/write on ActorsVoice
//   GH_REPO           — e.g. "robertdeanmoore/ActorsVoice"

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ACTIONS = ["triage-report", "implementation-plan", "implement-pr"];

const cors = {
  "Access-Control-Allow-Origin": "https://actorslines.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const fail = (status: number, message: string) =>
    new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    const { action, request_id, prompt, iteration, plan_path } = await req.json();
    if (!ALLOWED_ACTIONS.includes(action)) return fail(400, "Unknown action");
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
    if (!ghResp.ok) return fail(502, `GitHub dispatch failed: ${ghResp.status}`);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return fail(500, e instanceof Error ? e.message : "Unexpected error");
  }
});
