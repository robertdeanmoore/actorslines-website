// Inlet pipe edge function. Deploy: `supabase functions deploy inlet --no-verify-jwt` (bearer is
// INLET_TOKEN, not a user JWT; only this function is deployed that way). Logic and tests: core.ts.
// Secrets: INLET_TOKEN (fails closed with 503 when unset), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { handleInlet } from "./core.ts";

Deno.serve((req) =>
  handleInlet(req, {
    token: Deno.env.get("INLET_TOKEN"),
    supabaseUrl: Deno.env.get("SUPABASE_URL")!,
    serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    fetchFn: fetch,
  }));
