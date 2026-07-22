// Redeems a Box Office code (AL-XXXX-XXXX) for the calling (signed-in) user.
//
// Under Codes-first, this is the sales mechanism, not a convenience: payment arrives by any means
// (bank transfer, PayPal), Rob mints a code with admin_create_redemption_code, the buyer redeems
// it here. See docs/plans/box-office-phase-1.md.
//
// POST { "code": "AL-XXXX-XXXX" }
// Response 200: { ok, product_code, label, ends_at }
// Errors: 400 bad_request · 401 not_authenticated · 404 code_invalid · 410 code_expired ·
//         409 code_exhausted · 500 server_error

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set(["https://actorslines.app", "https://www.actorslines.app"]);

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://actorslines.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
}

/** AL-XXXX-XXXX, Crockford base32 -- normalise before hashing so `al-xxxx-xxxx` or stray
 *  whitespace/hyphen variance still matches what was hashed at mint time. */
function normalise(code: string): string {
  return code.trim().toUpperCase().replace(/[-\s]/g, "");
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const RPC_ERROR_TO_HTTP: Record<string, { status: number; code: string }> = {
  code_invalid: { status: 404, code: "code_invalid" },
  code_expired: { status: 410, code: "code_expired" },
  code_exhausted: { status: 409, code: "code_exhausted" },
};

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const fail = (status: number, code: string, message: string) => {
    console.error(`[redeem-code] ${status} ${code} ${message}`);
    return new Response(JSON.stringify({ code, message }), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  };

  try {
    const body = await req.json().catch(() => ({}));
    const rawCode = typeof body.code === "string" ? body.code : "";
    if (!rawCode) return fail(400, "bad_request", "code required");

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

    const hash = await sha256Hex(normalise(rawCode));
    const { data: rows, error } = await admin.rpc("redeem_code_tx", { p_hash: hash, p_user: user.id });

    if (error) {
      const mapped = RPC_ERROR_TO_HTTP[error.message];
      if (mapped) return fail(mapped.status, mapped.code, "This code isn't valid, has expired, or has already been fully used.");
      return fail(500, "server_error", error.message);
    }
    if (!rows || rows.length === 0) return fail(500, "server_error", "redeem_code_tx returned nothing");

    const result = rows[0] as { product_code: string; label: string; ends_at: string };
    console.log(`[redeem-code] redeemed user=${user.id} product=${result.product_code}`);
    return new Response(
      JSON.stringify({ ok: true, product_code: result.product_code, label: result.label, ends_at: result.ends_at }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[redeem-code] unhandled error", e);
    return fail(500, "server_error", e instanceof Error ? e.message : "Unexpected error");
  }
});
