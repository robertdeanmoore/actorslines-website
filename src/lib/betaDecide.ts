// Client for the beta-decide edge function (WIP #269): every accept/reject/
// resend/withdraw/reopen/group-email decision goes through it, never a direct
// table update from the browser. Error reading follows mfaVerify.ts: a non-2xx
// resolves as FunctionsHttpError and the JSON body is read via
// error.context.json().

import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import {
  describeOutcome,
  type BetaAction,
  type BetaDecideResult,
} from "./betaOutcome";

export { describeOutcome };
export type { BetaAction, BetaDecideResult };

const UNREACHABLE = "Could not reach the server. Check your connection and try again.";

export async function decideBeta(
  action: BetaAction,
  id: number,
  internalNote?: string,
): Promise<BetaDecideResult> {
  const body: Record<string, unknown> = { action, id };
  if (internalNote !== undefined) body.internal_note = internalNote;

  const { data, error } = await supabase.functions.invoke("beta-decide", { body });

  if (!error) {
    const d = (data ?? {}) as Record<string, unknown>;
    if (d.ok === true) {
      return {
        ok: true,
        status: typeof d.status === "string" ? d.status : "",
        emailSent: typeof d.email_sent === "boolean" ? d.email_sent : null,
        already: d.already === true,
        grantApplied: typeof d.grant_applied === "boolean" ? d.grant_applied : null,
        licenceRevoked: typeof d.licence_revoked === "boolean" ? d.licence_revoked : null,
      };
    }
    return { ok: false, error: typeof d.error === "string" ? d.error : UNREACHABLE };
  }

  if (error instanceof FunctionsHttpError) {
    try {
      const failure = await error.context.json();
      if (typeof failure?.error === "string") return { ok: false, error: failure.error };
    } catch {
      // Body wasn't JSON (network edge case) -- fall through to the generic message.
    }
  }

  return { ok: false, error: UNREACHABLE };
}
