// Throttled TOTP verification (RobLife WIP #103 Row 4, Holly's §5.1 finding).
//
// LoginPage.tsx's post-password step-up and ProfilePage.tsx's first-enrolment
// confirmation both used to call supabase.auth.mfa.challenge()/.verify()
// directly from the browser to Supabase's own domain -- no app-level
// throttle anywhere, and mfa.verify()'s own client API takes no captchaToken
// at all, so there was no mechanism available to gate it even if Turnstile
// were configured. This function is the server-side hop that lets an
// app-level attempt counter exist at all, modelled directly on
// ../trusted-device/index.ts's own caller.auth.getUser() pattern (forward the
// caller's Authorization header, never trust a client-asserted user id).
//
// Real-world exposure this closes: a second-factor brute force conditioned
// on the attacker already holding a valid password (TOTP verify only ever
// runs post-password/post-enrolment) -- narrower than an unauthenticated
// password-spray, but still the exact "second factor with no throttle" gap
// this app had no mechanism to close client-side.
//
// Does NOT close the separate, unrelated question of what Supabase's own
// project-level rate/attempt limits are for this endpoint -- that's a
// platform-level backstop this function cannot inspect or verify, tracked
// separately (WIP #103 §5.1's own note, Row 10's dashboard-check row).
//
// Request:  { "factorId": "...", "code": "123456" }
// Response: { "ok": true, "session": { access_token, refresh_token } }
//        or { "ok": false, "error": "...", "retryAfter"?: <seconds> }
//
// The caller's session sits at aal1 until this call succeeds -- verify()
// elevates it, but that elevation happens on THIS function's own ephemeral
// client, not the browser's. The new tokens are returned so the caller can
// apply them locally via supabase.auth.setSession(), the documented way to
// adopt a session obtained outside the browser client's own auth flow.
//
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY (already provisioned)

import { createClient } from "jsr:@supabase/supabase-js@2";

const SITE_URL = "https://actorslines.app";
const ALLOWED_ORIGINS = new Set(["https://actorslines.app", "https://www.actorslines.app"]);

// Same numeric shape as HelpOut-live's admin_2fa bucket (lib/auth/rate-limit.ts)
// -- no reason for the two sibling apps' equivalent controls to diverge
// numerically without a reason to.
const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 5;

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : SITE_URL,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
}

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const fail = (status: number, message: string, retryAfter?: number) => {
    console.error(`[mfa-verify] ${status} ${message}`);
    return new Response(JSON.stringify({ ok: false, error: message, retryAfter }), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  };
  const ok = (payload: Record<string, unknown>) =>
    new Response(JSON.stringify({ ok: true, ...payload }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json();
    const factorId = typeof body.factorId === "string" ? body.factorId : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!factorId || !code) return fail(400, "factorId and code are required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const caller = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return fail(401, "Not signed in");

    // Fails CLOSED: if the attempt-counter table can't be read, refuse
    // rather than wave the verify through -- same reasoning as HelpOut-
    // live's checkRateLimit (lib/auth/rate-limit.ts).
    const since = new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString();
    const { data: recent, error: countErr } = await admin
      .from("mfa_verify_attempts")
      .select("attempted_at")
      .eq("user_id", user.id)
      .gte("attempted_at", since);

    if (countErr) return fail(503, "Could not check your attempt history. Please try again.");

    if ((recent?.length ?? 0) >= MAX_ATTEMPTS) {
      const oldest = Math.min(...recent!.map((r) => new Date(r.attempted_at).getTime()));
      const retryAfter = Math.max(
        Math.ceil((oldest + WINDOW_SECONDS * 1000 - Date.now()) / 1000),
        1,
      );
      return fail(429, "Too many attempts. Try again shortly.", retryAfter);
    }

    // Recorded before the verify call itself, not after: a failed verify
    // still counts as an attempt, which is the entire point of a brute-force
    // throttle -- only counting successes would leave the guess-and-check
    // loop completely unthrottled.
    const { error: insErr } = await admin
      .from("mfa_verify_attempts")
      .insert({ user_id: user.id });
    if (insErr) return fail(503, "Could not record this attempt. Please try again.");

    const { data: challenge, error: challengeErr } = await caller.auth.mfa.challenge({ factorId });
    if (challengeErr || !challenge) {
      return fail(400, challengeErr?.message ?? "Could not start the security check.");
    }

    const { data: verified, error: verifyErr } = await caller.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });
    if (verifyErr || !verified) {
      return fail(400, "That code wasn't right — try again.");
    }

    console.log(`[mfa-verify] verified user=${user.id}`);
    return ok({
      session: {
        access_token: verified.access_token,
        refresh_token: verified.refresh_token,
      },
    });
  } catch (e) {
    console.error("[mfa-verify] unhandled error", e);
    return fail(500, e instanceof Error ? e.message : "Unexpected error");
  }
});
