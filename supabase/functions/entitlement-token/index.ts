// Issues/refreshes an entitlement token for the calling (signed-in) user. The Android app calls
// this on foreground-with-stale-token and on manual refresh (Phase 2).
//
// POST, no body needed -- the caller is identified from their session JWT.
// Response 200: { token, ent, token_exp } (ent/token_exp are echoed back for curl/website
// convenience -- the app derives everything it needs from the signed token itself).
// Errors: 401 not_authenticated · 500 signing_error / server_error.
//
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (already provisioned),
//          ENTITLEMENT_SIGNING_KEY_B64 (base64 one-line PKCS8 PEM, see SETUP.md S11),
//          ENTITLEMENT_KEY_ID (e.g. "al-2026-1")

import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildClaims, signEntitlementToken, type EntitlementsRow } from "./token.ts";

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

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const fail = (status: number, code: string, message: string) => {
    console.error(`[entitlement-token] ${status} ${code} ${message}`);
    return new Response(JSON.stringify({ code, message }), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  };

  try {
    const caller = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return fail(401, "not_authenticated", "Not signed in");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: rows, error: rpcErr } = await admin.rpc("entitlements_for", { p_user: user.id });
    if (rpcErr || !rows || rows.length === 0) {
      return fail(500, "server_error", rpcErr?.message ?? "entitlements_for returned nothing");
    }
    const row = rows[0] as EntitlementsRow;

    const kid = Deno.env.get("ENTITLEMENT_KEY_ID");
    const signingKeyB64 = Deno.env.get("ENTITLEMENT_SIGNING_KEY_B64");
    if (!kid || !signingKeyB64) {
      return fail(500, "signing_error", "Signing key not configured (see SETUP.md S11)");
    }

    const nowEpochSeconds = Math.floor(Date.now() / 1000);
    const claims = buildClaims(user.id, row, nowEpochSeconds);

    let token: string;
    try {
      token = await signEntitlementToken(claims, kid, signingKeyB64);
    } catch (e) {
      return fail(500, "signing_error", e instanceof Error ? e.message : "Signing failed");
    }

    console.log(`[entitlement-token] issued user=${user.id} tier=${row.tier_label} exp=${claims.exp}`);
    return new Response(
      JSON.stringify({ token, ent: row.ent, token_exp: claims.exp }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[entitlement-token] unhandled error", e);
    return fail(500, "server_error", e instanceof Error ? e.message : "Unexpected error");
  }
});
