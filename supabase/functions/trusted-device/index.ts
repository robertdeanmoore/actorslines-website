// "Trust this device for 30 days" — lets a signed-in user skip the TOTP challenge on a
// browser they've already verified once. The raw device token only ever lives in the
// caller's browser; only its SHA-256 hash is stored server-side.
//
// Actions (both require the caller to be signed in — Authorization header forwarded):
//   { "action": "issue" }                 — mints a new trusted-device token for the
//                                            caller, valid 30 days. Call this right after
//                                            a successful mfa.verify().
//   { "action": "check", "token": "..." }  — returns { trusted: boolean } for the caller.
//
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY (already provisioned)

import { createClient } from "jsr:@supabase/supabase-js@2";

const SITE_URL = "https://actorslines.app";

// The live site is reachable at both the bare and www domains (neither redirects to the
// other), so CORS must allow whichever one the request actually came from.
const ALLOWED_ORIGINS = new Set(["https://actorslines.app", "https://www.actorslines.app"]);

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : SITE_URL,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const fail = (status: number, message: string) => {
    console.error(`[trusted-device] ${status} ${message}`);
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  };
  const ok = (payload: Record<string, unknown>) =>
    new Response(JSON.stringify(payload), { headers: { ...cors, "Content-Type": "application/json" } });

  let action: string | undefined;

  try {
    const body = await req.json();
    action = body.action;

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

    if (action === "issue") {
      const token = generateToken();
      const tokenHash = await hashToken(token);
      const { error: insErr } = await admin.from("trusted_devices").insert({
        user_id: user.id,
        token_hash: tokenHash,
        user_agent: req.headers.get("User-Agent") ?? null,
      });
      if (insErr) return fail(500, insErr.message);

      console.log(`[trusted-device] issued user=${user.id}`);
      return ok({ token });
    }

    if (action === "check") {
      const token = typeof body.token === "string" ? body.token : "";
      if (!token) return ok({ trusted: false });
      const tokenHash = await hashToken(token);
      const { data: device } = await admin
        .from("trusted_devices")
        .select("id, expires_at, revoked_at")
        .eq("user_id", user.id)
        .eq("token_hash", tokenHash)
        .single();
      if (!device || device.revoked_at || new Date(device.expires_at).getTime() < Date.now()) {
        return ok({ trusted: false });
      }
      await admin.from("trusted_devices").update({ last_used_at: new Date().toISOString() }).eq("id", device.id);
      return ok({ trusted: true });
    }

    return fail(400, "Unknown action");
  } catch (e) {
    console.error(`[trusted-device] unhandled error action=${action ?? "unknown"}`, e);
    return fail(500, e instanceof Error ? e.message : "Unexpected error");
  }
});
